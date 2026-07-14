import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { lookupProviders } from "./fccService";
import { rankProviders } from "./brain/recommendationEngine";
import { buildQuote } from "./brain/quoteEngine";
import { advisorReadiness, excludeCurrentCarrier, hasCompleteFccAddress, identityKeys, mergeLeadData, readinessScore } from "./smartLeadIntake";

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

export async function enrichAndCreateLead(lead, context = {}) {
  const fccEligible = hasCompleteFccAddress(lead);
  let ranked = [];
  let recommendation = null;
  let quote = null;
  let fccComplete = false;
  let enrichmentError = "";

  if (fccEligible) {
    try {
      const lookup = await lookupProviders(lead.fullAddress);
      const rawProviders = lookup.providers?.length ? lookup.providers : lookup.fallbackProviders || [];
      const eligibleProviders = excludeCurrentCarrier(rawProviders, lead.currentCarrier);
      ranked = rankProviders(eligibleProviders, DEFAULT_NEEDS);
      recommendation = ranked[0] || null;
      quote = recommendation ? buildQuote({ recommendation, address: lead.fullAddress, needs: DEFAULT_NEEDS }) : null;
      fccComplete = true;
    } catch (error) {
      enrichmentError = error.message || "FCC enrichment failed";
    }
  }

  const readiness = readinessScore(lead, {
    fccComplete,
    recommendation,
    quote,
    assignedAdvisor: context.assignedAdvisor,
  });
  const contactReadiness = advisorReadiness(lead);
  const createdAtIso = new Date().toISOString();
  const enrichmentStatus = !fccEligible
    ? "needs_address_enrichment"
    : enrichmentError
      ? "fcc_review"
      : recommendation
        ? "ready"
        : "provider_review";

  return addDoc(collection(db, "leads"), {
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
    providers: ranked,
    availableProviders: ranked,
    currentCarrier: lead.currentCarrier || "",
    recommendedProvider: recommendation?.displayName || "",
    recommendationSnapshot: recommendation,
    quote,
    needs: DEFAULT_NEEDS,
    readinessScore: readiness,
    enrichmentStatus,
    enrichmentError,
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
  });
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

export async function processLeadBatch(leads = [], options = {}, onProgress = () => {}) {
  const identityIndex = await loadExistingIdentityIndex();
  const batchId = await createImportBatch({
    name: options.batchName || `CSV Import ${new Date().toLocaleDateString()}`,
    filename: options.filename || "",
    totalRows: leads.length,
    leadSource: options.leadSource || "CSV Import",
    campaign: options.campaign || "",
    vendor: options.vendor || "",
  });
  const results = [];
  for (let index = 0; index < leads.length; index += 1) {
    const lead = leads[index];
    const keys = identityKeys(lead);
    const existingRecord = keys.map((key) => identityIndex.get(key)).find(Boolean);
    if (existingRecord) {
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
      try {
        const ref = await enrichAndCreateLead(lead, { ...options, batchId });
        const record = { id: ref.id, ref, data: lead };
        keys.forEach((key) => identityIndex.set(key, record));
        results.push({
          index,
          status: hasCompleteFccAddress(lead) ? "ready" : "needs_enrichment",
          leadId: ref.id,
          lead,
        });
      } catch (error) {
        results.push({ index, status: "failed", error: error.message, lead });
      }
    }
    const counters = {
      total: leads.length,
      processed: index + 1,
      ready: results.filter((item) => item.status === "ready").length,
      needsEnrichment: results.filter((item) => item.status === "needs_enrichment").length,
      merged: results.filter((item) => item.status === "merged").length,
      failed: results.filter((item) => item.status === "failed").length,
      duplicates: 0,
    };
    onProgress({ batchId, counters, current: lead });
    if ((index + 1) % 5 === 0 || index === leads.length - 1) await updateBatch(batchId, { counters });
  }
  await updateBatch(batchId, { status: "complete", completedAt: serverTimestamp() });
  return { batchId, results };
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
