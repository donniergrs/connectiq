import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function db() {
  if (!getApps().length) initializeApp();
  return getFirestore();
}
function providerName(provider = {}) { return provider.displayName || provider.brand_name || provider.provider_name || provider.name || ""; }
function crmStatus(stage = "Address Verified") {
  const value = String(stage || "").toLowerCase();
  if (/order.ready|ready.for.order|completed/.test(value)) return "Ready to Submit";
  if (/quote|recommendation/.test(value)) return "Quoted";
  if (/qualified/.test(value)) return "Qualified";
  return "New Lead";
}
function timelineEvent(type, detail = "") { return { type, detail, at: new Date().toISOString() }; }

async function findBySession(sessionId) {
  const snapshot = await db().collection("leads").where("advisorSessionId", "==", sessionId).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0].ref;
}

export async function persistAdvisorLead(payload = {}) {
  const sessionId = String(payload.sessionId || "").trim();
  const address = String(payload.address || "").trim();
  if (!sessionId || !address) throw new Error("sessionId and address are required to persist an advisor lead.");
  const providers = Array.isArray(payload.providers) ? payload.providers : [];
  const memory = payload.memory || {};
  const facts = memory.facts || {};
  const intelligence = payload.intelligence || {};
  const quote = payload.quote || null;
  const now = FieldValue.serverTimestamp();
  let ref = await findBySession(sessionId);
  const isNew = !ref;
  if (!ref) ref = db().collection("leads").doc();
  const existingSnap = isNew ? null : await ref.get();
  const existing = existingSnap?.exists ? existingSnap.data() : {};
  const stage = payload.stage || intelligence.pipelineStage || memory.stage || existing.pipelineStage || "Address Verified";
  const contactCaptured = Boolean(facts.email || facts.phone || existing.email || existing.phone);
  const timeline = Array.isArray(existing.conversationTimeline) ? existing.conversationTimeline : [];
  const additions = [
    ...(isNew ? [timelineEvent("Address Verified", address)] : []),
    ...(payload.customerMessage ? [timelineEvent("Customer Message", payload.customerMessage)] : []),
    ...(facts.currentProvider ? [timelineEvent("Provider Captured", facts.currentProvider)] : []),
    ...(facts.customerName ? [timelineEvent("Customer Identified", facts.customerName)] : []),
    ...(quote?.provider ? [timelineEvent("Recommendation Presented", quote.provider)] : []),
    ...(contactCaptured ? [timelineEvent("Contact Captured", [facts.phone || existing.phone, facts.email || existing.email].filter(Boolean).join(" · "))] : []),
    ...(payload.advisorMessage ? [timelineEvent(stage, payload.advisorMessage)] : []),
  ];
  const data = {
    advisorSessionId: sessionId, conversationId: sessionId, address, providers,
    providerOptions: providers.map(providerName).filter(Boolean),
    source: "connectiq_ai_sales_advisor",
    name: facts.customerName || existing.name || "AI Advisor Customer",
    preferredName: facts.preferredName || facts.customerName || existing.preferredName || "",
    currentProvider: facts.currentProvider || existing.currentProvider || "",
    monthlyBill: facts.monthlyBill ?? existing.monthlyBill ?? null,
    email: facts.email || existing.email || "", phone: facts.phone || existing.phone || "",
    contactPreference: facts.contactPreference || existing.contactPreference || "",
    painPoints: memory.painPoints || existing.painPoints || [],
    usageProfile: memory.householdNeeds || existing.usageProfile || [],
    preferences: memory.preferences || existing.preferences || [],
    recommendedProvider: quote?.provider || memory.selectedProvider || existing.recommendedProvider || providerName(providers[0]),
    status: crmStatus(stage), pipelineStage: stage,
    leadScore: intelligence.leadScore ?? existing.leadScore ?? 17,
    buyingIntent: intelligence.buyingIntent || existing.buyingIntent || "Low",
    priority: intelligence.priority || existing.priority || "Normal",
    closeProbability: intelligence.closeProbability ?? existing.closeProbability ?? 12,
    quoteReady: Boolean(quote?.provider || intelligence.quoteReady || existing.quoteReady),
    orderReady: /ORDER_READY|COMPLETED/i.test(stage) || Boolean(intelligence.orderReady),
    provisional: !contactCaptured,
    lastCustomerMessage: payload.customerMessage || existing.lastCustomerMessage || "",
    lastAdvisorMessage: payload.advisorMessage || existing.lastAdvisorMessage || "",
    conversationSummary: intelligence.conversationSummary || existing.conversationSummary || "",
    conversationTimeline: [...timeline, ...additions].slice(-100),
    updatedAt: now, lastActivityAt: now,
    ...(isNew ? { createdAt: now } : {}),
  };
  await ref.set(data, { merge: true });
  return { leadId: ref.id, created: isNew, stage, status: data.status };
}
