import { addDoc, collection, getDocs, limit, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";

const leadRefBySession = new Map();

function providerName(provider) {
  return provider?.displayName || provider?.brand_name || provider?.provider_name || provider?.name || "";
}


function crmStatus(pipelineStage = "New Lead") {
  if (pipelineStage === "Order Ready") return "Ready to Submit";
  if (["Quote Ready", "Recommendation Presented"].includes(pipelineStage)) return "Quoted";
  if (pipelineStage === "Qualified") return "Qualified";
  return "New Lead";
}

function timelineEvent(type, detail = "") {
  return { type, detail, at: new Date().toISOString() };
}

async function findLead(sessionId) {
  if (leadRefBySession.has(sessionId)) return leadRefBySession.get(sessionId);
  const snapshot = await getDocs(query(collection(db, "leads"), where("advisorSessionId", "==", sessionId), limit(1)));
  if (snapshot.empty) return null;
  const ref = snapshot.docs[0].ref;
  leadRefBySession.set(sessionId, ref);
  return ref;
}

export async function ensureAdvisorLead({ sessionId, address, providers = [] }) {
  if (!sessionId || !address?.trim()) return null;
  const existing = await findLead(sessionId);
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, "leads"), {
    name: "AI Advisor Customer",
    advisorSessionId: sessionId,
    conversationId: sessionId,
    address: address.trim(),
    providers,
    providerOptions: providers.map(providerName).filter(Boolean),
    recommendedProvider: providerName(providers[0]),
    source: "connectiq_ai_sales_advisor",
    status: "Address Verified",
    pipelineStage: "Address Verified",
    priority: "Normal",
    closeProbability: 12,
    likelyObjection: "No primary objection identified yet",
    leadScore: 17,
    buyingIntent: "Low",
    quoteReady: false,
    orderReady: false,
    provisional: true,
    conversationTimeline: [timelineEvent("Address Verified", address.trim())],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  leadRefBySession.set(sessionId, ref);
  return ref.id;
}

export async function syncAdvisorLead({ sessionId, address, providers = [], memory = {}, intelligence = {}, quote = null, customerMessage = "", advisorMessage = "" }) {
  await ensureAdvisorLead({ sessionId, address, providers });
  const ref = await findLead(sessionId);
  if (!ref) return null;
  const facts = memory.facts || {};
  const contactCaptured = Boolean(facts.email || facts.phone);
  const timeline = [
    timelineEvent("Customer Message", customerMessage),
    ...(facts.currentProvider ? [timelineEvent("Provider Captured", facts.currentProvider)] : []),
    ...(facts.monthlyBill ? [timelineEvent("Budget Captured", `$${facts.monthlyBill}/month`)] : []),
    ...(quote?.provider ? [timelineEvent("Recommendation Presented", quote.provider)] : []),
    ...(contactCaptured ? [timelineEvent("Contact Captured", [facts.phone, facts.email].filter(Boolean).join(" · "))] : []),
    timelineEvent(intelligence.pipelineStage || "Discovery", advisorMessage),
  ];
  const existing = (await getDocs(query(collection(db, "leads"), where("advisorSessionId", "==", sessionId), limit(1)))).docs[0]?.data() || {};
  const existingTimeline = Array.isArray(existing.conversationTimeline) ? existing.conversationTimeline : [];
  await updateDoc(ref, {
    address: address || existing.address || "",
    providers,
    providerOptions: providers.map(providerName).filter(Boolean),
    currentProvider: facts.currentProvider || existing.currentProvider || "",
    monthlyBill: facts.monthlyBill || existing.monthlyBill || null,
    email: facts.email || existing.email || "",
    phone: facts.phone || existing.phone || "",
    name: facts.customerName || existing.name || "AI Advisor Customer",
    preferredName: facts.preferredName || facts.customerName || existing.preferredName || "",
    contactPreference: facts.contactPreference || existing.contactPreference || "",
    bestContactTime: facts.bestContactTime || existing.bestContactTime || "",
    contactConsent: {
      quoteRequested: Boolean(facts.email || facts.phone || existing.contactConsent?.quoteRequested),
      preferredMethod: facts.contactPreference || existing.contactConsent?.preferredMethod || "",
      capturedAt: (facts.email || facts.phone) ? new Date().toISOString() : (existing.contactConsent?.capturedAt || null),
    },
    painPoints: memory.painPoints || [],
    usageProfile: memory.householdNeeds || [],
    preferences: memory.preferences || [],
    recommendedProvider: quote?.provider || existing.recommendedProvider || providerName(providers[0]),
    leadScore: intelligence.leadScore ?? existing.leadScore ?? 0,
    buyingIntent: intelligence.buyingIntent || existing.buyingIntent || "Low",
    priority: intelligence.priority || existing.priority || "Normal",
    closeProbability: intelligence.closeProbability ?? existing.closeProbability ?? 0,
    likelyObjection: intelligence.likelyObjection || existing.likelyObjection || "",
    customerPersona: memory.relationship?.persona || existing.customerPersona || "general_shopper",
    customerEmotion: memory.relationship?.emotion || existing.customerEmotion || "neutral",
    primaryMotivation: memory.relationship?.primaryMotivation || existing.primaryMotivation || "undetermined",
    buyingReadiness: memory.relationship?.readiness || existing.buyingReadiness || "initial",
    adaptiveStrategyObjective: memory.relationship?.strategyObjective || existing.adaptiveStrategyObjective || "",
    status: crmStatus(intelligence.pipelineStage || existing.pipelineStage),
    pipelineStage: intelligence.pipelineStage || existing.pipelineStage || "Discovery",
    quoteReady: Boolean(intelligence.quoteReady),
    orderReady: Boolean(intelligence.orderReady),
    nextBestAction: intelligence.nextBestAction || "continue_discovery",
    followUpPlan: intelligence.followUpPlan || existing.followUpPlan || null,
    followUpRequired: Boolean(intelligence.followUpPlan?.required),
    buyingSignals: intelligence.signals || [],
    conversationSummary: intelligence.conversationSummary || "",
    lastCustomerMessage: customerMessage,
    lastAdvisorMessage: advisorMessage,
    conversationTimeline: [...existingTimeline, ...timeline].slice(-100),
    provisional: !contactCaptured,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  return ref.id;
}
