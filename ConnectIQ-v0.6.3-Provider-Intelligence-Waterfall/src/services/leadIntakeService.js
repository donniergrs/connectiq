import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { lookupProviderIntelligence } from "./provider-intelligence";
import { buildQuote } from "./brain/quoteEngine";
import { advisorReadiness, hasCompleteFccAddress, identityKeys, mergeLeadData, readinessScore } from "./smartLeadIntake";
import { buildImportExecutionPlan } from "./importExecution.js";

const DEFAULT_NEEDS = { people: 2, devices: 6, streaming: true, workFromHome: false, gaming: false, priority: "reliability" };

export async function loadExistingIdentityIndex() {
  const snapshot = await getDocs(collection(db, "leads"));
  const index = new Map();
  snapshot.docs.forEach((item) => {
    identityKeys(item.data()).forEach((key) => index.set(key, { id: item.id, ref: item.ref, data: item.data() }));
  });
  return index;
}

export async function createImportBatch(metadata = {}) {
  const ref = await addDoc(collection(db, "leadImportBatches"), {
    ...metadata,
    status: "processing",
    counters: { total: metadata.totalRows || 0, processed: 0, ready: 0, failed: 0, duplicates: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function updateBatch(batchId, patch) {
  await setDoc(doc(db, "leadImportBatches", batchId), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

function buildQueuedLeadPayload(lead, context = {}) {
  const fccEligible = hasCompleteFccAddress(lead);
  const contactReadiness = advisorReadiness(lead);
  const createdAtIso = new Date().toISOString();
  return {
    ...lead,
    status: contactReadiness === "needs_contact_research" ? "Needs Enrichment" : "New",
    advisorReadiness: contactReadiness,
    source: lead.leadSource || context.leadSource || "CSV Import",
    campaign: lead.campaign || context.campaign || "",
    vendor: lead.vendor || context.vendor || "",
    costPerLead: Number(lead.costPerLead || context.costPerLead || 0),
    purchaseDate: lead.purchaseDate || context.purchaseDate || "",
    importBatchId: context.batchId,
    assignedAdvisor: context.assignedAdvisor || null,
    providers: [],
    availableProviders: [],
    aiProviderCandidates: [],
    providerLookupSource: "",
    providerLookupStatus: fccEligible ? "queued" : "address_incomplete",
    currentCarrier: lead.currentCarrier || "",
    recommendedProvider: "",
    recommendationSnapshot: null,
    quote: null,
    needs: DEFAULT_NEEDS,
    readinessScore: readinessScore(lead, { fccComplete: false, recommendation: null, quote: null, assignedAdvisor: context.assignedAdvisor }),
    enrichmentStatus: fccEligible ? "queued_for_provider_enrichment" : "needs_address_enrichment",
    enrichmentError: "",
    enrichmentDeferred: fccEligible,
    activity: [{
      type: "imported",
      status: contactReadiness === "needs_contact_research" ? "Needs Enrichment" : "New",
      note: `Lead imported from ${lead.leadSource || context.leadSource || "CSV"}`,
      createdAt: createdAtIso,
    }],
    opportunityJournal: [{
      type: "lead_imported",
      title: "Lead imported",
      description: `Imported in batch ${context.batchId}`,
      actor: context.actor || "ConnectIQ Import Engine",
      createdAt: createdAtIso,
    }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function enrichAndCreateLead(lead, context = {}) {
  const ref = doc(collection(db, "leads"));
  await setDoc(ref, buildQueuedLeadPayload(lead, context));
  return ref;
}

async function enrichLeadRecord(leadId, lead, context = {}) {
  if (!hasCompleteFccAddress(lead)) return { leadId, status: "needs_address_enrichment" };
  try {
    const intelligence = await lookupProviderIntelligence(lead.fullAddress, {
      currentCarrier: lead.currentCarrier,
      needs: DEFAULT_NEEDS,
      timeoutMs: context.lookupTimeoutMs || 15000,
    });
    const ranked = intelligence.recommendation?.eligibleProviders || [];
    const recommendation = intelligence.recommendation?.recommendation || null;
    const quote = recommendation ? buildQuote({ recommendation, address: lead.fullAddress, needs: DEFAULT_NEEDS }) : null;
    const fccComplete = intelligence.status === "verified" || intelligence.status === "no_verified_providers";
    const enrichmentError = ["failed", "timeout"].includes(intelligence.status) ? intelligence.error || intelligence.status : "";
    const enrichmentStatus = enrichmentError ? "provider_lookup_failed" : recommendation ? "ready" : intelligence.status === "database_missing" ? "provider_database_not_loaded" : "no_verified_providers";
    await setDoc(doc(db, "leads", leadId), {
      providers: ranked,
      availableProviders: ranked,
      aiProviderCandidates: intelligence.aiCandidates || [],
      providerLookupSource: intelligence.source || "",
      providerLookupStatus: intelligence.status || "",
      providerDataset: intelligence.bdc?.dataset || null,
      recommendedProvider: recommendation?.displayName || recommendation?.name || "",
      recommendationSnapshot: recommendation,
      quote,
      readinessScore: readinessScore(lead, { fccComplete, recommendation, quote, assignedAdvisor: context.assignedAdvisor }),
      enrichmentStatus,
      enrichmentError,
      enrichmentDeferred: false,
      enrichedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { leadId, status: enrichmentStatus };
  } catch (error) {
    await setDoc(doc(db, "leads", leadId), {
      providerLookupStatus: "failed",
      enrichmentStatus: "provider_lookup_failed",
      enrichmentError: error.message || "Provider enrichment failed",
      enrichmentDeferred: false,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { leadId, status: "failed", error: error.message };
  }
}

async function mergeIntoExistingLead(existingRecord, lead, context = {}) {
  const existing = existingRecord.data || {};
  const merged = mergeLeadData(existing, lead);
  const createdAtIso = new Date().toISOString();
  const journal = [
    ...(existing.opportunityJournal || []),
    {
      type: "lead_enriched_from_import",
      title: "Lead enriched from import",
      description: `New information merged from batch ${context.batchId}`,
      actor: context.actor || "ConnectIQ Import Engine",
      createdAt: createdAtIso,
    },
  ];
  await setDoc(existingRecord.ref, {
    ...merged,
    advisorReadiness: advisorReadiness(merged),
    opportunityJournal: journal,
    lastImportBatchId: context.batchId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return existingRecord.id;
}

function pauseForBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function processLeadBatch(leads = [], options = {}, onProgress = () => {}) {
  const executionPlan = buildImportExecutionPlan(leads.length, options);
  const identityIndex = await loadExistingIdentityIndex();
  const batchId = await createImportBatch({
    name: options.batchName || `CSV Import ${new Date().toLocaleDateString()}`,
    filename: options.filename || "",
    totalRows: leads.length,
    leadSource: options.leadSource || "CSV Import",
    campaign: options.campaign || "",
    vendor: options.vendor || "",
    executionPlan,
  });
  const results = [];
  let write = writeBatch(db);
  let pendingWrites = 0;

  for (let index = 0; index < leads.length; index += 1) {
    const lead = leads[index];
    const keys = identityKeys(lead);
    const existingRecord = keys.map((key) => identityIndex.get(key)).find(Boolean);
    if (existingRecord) {
      if (pendingWrites) { await write.commit(); write = writeBatch(db); pendingWrites = 0; }
      try {
        const leadId = await mergeIntoExistingLead(existingRecord, lead, { ...options, batchId });
        const mergedData = mergeLeadData(existingRecord.data, lead);
        const updatedRecord = { ...existingRecord, data: mergedData };
        identityKeys(mergedData).forEach((key) => identityIndex.set(key, updatedRecord));
        results.push({ index, status: "merged", leadId, lead });
      } catch (error) {
        results.push({ index, status: "failed", error: error.message, lead });
      }
    } else {
      const ref = doc(collection(db, "leads"));
      write.set(ref, buildQueuedLeadPayload(lead, { ...options, batchId }));
      pendingWrites += 1;
      const record = { id: ref.id, ref, data: lead };
      keys.forEach((key) => identityIndex.set(key, record));
      results.push({ index, status: hasCompleteFccAddress(lead) ? "queued" : "needs_enrichment", leadId: ref.id, lead });
    }

    if (pendingWrites >= executionPlan.chunkSize || index === leads.length - 1) {
      if (pendingWrites) { await write.commit(); write = writeBatch(db); pendingWrites = 0; }
      const counters = {
        total: leads.length,
        processed: index + 1,
        created: results.filter((item) => item.status === "queued" || item.status === "needs_enrichment").length,
        queued: results.filter((item) => item.status === "queued").length,
        needsEnrichment: results.filter((item) => item.status === "needs_enrichment").length,
        merged: results.filter((item) => item.status === "merged").length,
        failed: results.filter((item) => item.status === "failed").length,
      };
      onProgress({ batchId, counters, current: lead, phase: "creating_leads" });
      await updateBatch(batchId, { status: "enrichment_queued", counters, checkpoint: index + 1, executionPlan });
      await pauseForBrowser();
    }
  }

  const queued = results.filter((item) => item.status === "queued");
  setTimeout(() => runBackgroundEnrichment(batchId, queued, options, executionPlan, onProgress), 0);
  return { batchId, results, executionPlan, enrichmentQueued: queued.length };
}

async function runBackgroundEnrichment(batchId, queued, options, executionPlan, onProgress) {
  if (!queued.length) {
    await updateBatch(batchId, { status: "complete", completedAt: serverTimestamp() });
    return;
  }
  await updateBatch(batchId, { status: "enriching", enrichmentStartedAt: serverTimestamp() });
  let cursor = 0;
  const outcomes = [];
  async function worker() {
    while (cursor < queued.length) {
      const item = queued[cursor]; cursor += 1;
      const outcome = await enrichLeadRecord(item.leadId, item.lead, options);
      outcomes.push(outcome);
      const counters = {
        total: queued.length,
        processed: outcomes.length,
        ready: outcomes.filter((entry) => entry.status === "ready").length,
        noVerifiedProviders: outcomes.filter((entry) => entry.status === "no_verified_providers").length,
        databaseNotLoaded: outcomes.filter((entry) => entry.status === "provider_database_not_loaded").length,
        failed: outcomes.filter((entry) => entry.status === "failed" || entry.status === "provider_lookup_failed").length,
      };
      onProgress({ batchId, counters, current: item.lead, phase: "background_enrichment" });
      if (outcomes.length % 10 === 0 || outcomes.length === queued.length) await updateBatch(batchId, { enrichmentCounters: counters });
    }
  }
  await Promise.all(Array.from({ length: Math.min(executionPlan.enrichmentConcurrency, queued.length) }, () => worker()));
  await updateBatch(batchId, { status: "complete", completedAt: serverTimestamp(), enrichmentCounters: { total: queued.length, processed: outcomes.length } });
}

export async function resumeImportBatchEnrichment(batchId, options = {}, onProgress = () => {}) {
  const snapshot = await getDocs(query(collection(db, "leads"), where("importBatchId", "==", batchId)));
  const queued = snapshot.docs
    .map((item) => ({ leadId: item.id, lead: item.data() }))
    .filter((item) => ["queued_for_provider_enrichment", "provider_lookup_failed", "provider_database_not_loaded"].includes(item.lead.enrichmentStatus));
  const plan = buildImportExecutionPlan(queued.length, options);
  await runBackgroundEnrichment(batchId, queued, options, plan, onProgress);
  return { batchId, resumed: queued.length };
}

export async function rollbackImportBatch(batchId) {
  const snapshot = await getDocs(query(collection(db, "leads"), where("importBatchId", "==", batchId)));
  let batch = writeBatch(db);
  let count = 0;
  for (const leadDoc of snapshot.docs) {
    batch.delete(leadDoc.ref);
    count += 1;
    if (count % 450 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 450 !== 0) await batch.commit();
  await updateBatch(batchId, { status: "rolled_back", rolledBackAt: serverTimestamp(), rolledBackCount: count });
  return count;
}
