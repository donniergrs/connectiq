import { addDoc, arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase.js";

const text = (value) => String(value ?? "").trim();
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ORDERIQ_REQUIRED_FIELDS = [
  ["customerName", "Customer name"],
  ["phone", "Phone number"],
  ["email", "Email address"],
  ["serviceAddress", "Service address"],
  ["provider", "Provider"],
  ["plan", "Plan"],
  ["monthlyPrice", "Monthly price"],
  ["contactPreference", "Contact preference"],
  ["consentConfirmed", "Customer consent"],
];

export function buildOrderDraft({ lead = {}, workspace = {}, quote = null } = {}) {
  const customer = workspace.customer || {};
  const recommendation = workspace.recommendation || {};
  const quoteOffer = quote?.offer || {};
  const existing = lead.orderIQ || {};
  return {
    leadId: lead.id || "",
    quoteId: quote?.quoteId || lead.quoteId || existing.quoteId || "",
    customerName: existing.customerName || customer.name || lead.name || "",
    phone: existing.phone || customer.phone || lead.phone || "",
    email: existing.email || customer.email || lead.email || "",
    serviceAddress: existing.serviceAddress || customer.address || lead.address || "",
    provider: existing.provider || quoteOffer.provider || recommendation.provider || lead.recommendedProvider || "",
    plan: existing.plan || quoteOffer.plan || recommendation.plan || lead.recommendedPlan || "",
    technology: existing.technology || quoteOffer.technology || recommendation.technology || "",
    download: existing.download || quoteOffer.download || recommendation.download || "",
    upload: existing.upload || quoteOffer.upload || recommendation.upload || "",
    monthlyPrice: existing.monthlyPrice ?? quoteOffer.monthlyPrice ?? recommendation.monthlyPrice ?? "",
    equipment: existing.equipment || quoteOffer.equipment || "Customer-provided / verify with provider",
    equipmentFee: existing.equipmentFee ?? quoteOffer.equipmentFee ?? 0,
    installationFee: existing.installationFee ?? quoteOffer.installationFee ?? 0,
    promotion: existing.promotion || quoteOffer.promotion || "",
    contract: existing.contract || quoteOffer.contract || "",
    installationPreference: existing.installationPreference || "First available",
    contactPreference: existing.contactPreference || lead.preferredContactMethod || "",
    preferredContactTime: existing.preferredContactTime || lead.preferredContactTime || "",
    consentConfirmed: Boolean(existing.consentConfirmed ?? customer.consent ?? lead.consent),
    advisorOverrideReason: existing.advisorOverrideReason || "",
    specialInstructions: existing.specialInstructions || "",
    expectedCommission: existing.expectedCommission ?? lead.expectedCommission ?? 0,
    externalOrderId: existing.externalOrderId || "",
    status: existing.status || "Draft",
  };
}

export function evaluateOrderReadiness(order = {}) {
  const missing = [];
  ORDERIQ_REQUIRED_FIELDS.forEach(([key, label]) => {
    if (key === "consentConfirmed") {
      if (!order[key]) missing.push(label);
      return;
    }
    if (!text(order[key])) missing.push(label);
  });
  const optional = [];
  if (!text(order.installationPreference)) optional.push("Installation preference");
  if (!text(order.promotion)) optional.push("Promotion details");
  if (!text(order.preferredContactTime)) optional.push("Preferred contact time");
  const completed = ORDERIQ_REQUIRED_FIELDS.length - missing.length;
  const score = Math.round((completed / ORDERIQ_REQUIRED_FIELDS.length) * 100);
  return {
    score,
    missing,
    optional,
    ready: missing.length === 0,
    status: missing.length === 0 ? "Ready to Submit" : "Draft",
  };
}

export function buildDsiOrderSummary(order = {}, readiness = evaluateOrderReadiness(order)) {
  const lines = [
    "CONNECTIQ ORDERIQ — DSI ORDER SUMMARY",
    `Readiness: ${readiness.score}% (${readiness.ready ? "READY TO SUBMIT" : "INCOMPLETE"})`,
    "",
    "CUSTOMER",
    `Name: ${text(order.customerName) || "MISSING"}`,
    `Phone: ${text(order.phone) || "MISSING"}`,
    `Email: ${text(order.email) || "MISSING"}`,
    `Service address: ${text(order.serviceAddress) || "MISSING"}`,
    `Contact preference: ${text(order.contactPreference) || "MISSING"}`,
    `Preferred contact time: ${text(order.preferredContactTime) || "Not specified"}`,
    `Consent confirmed: ${order.consentConfirmed ? "Yes" : "No"}`,
    "",
    "SERVICE",
    `Provider: ${text(order.provider) || "MISSING"}`,
    `Plan: ${text(order.plan) || "MISSING"}`,
    `Technology: ${text(order.technology) || "Not specified"}`,
    `Speed: ${text(order.download) || "—"} Mbps down / ${text(order.upload) || "—"} Mbps up`,
    `Monthly price: $${number(order.monthlyPrice).toFixed(2)}`,
    `Equipment: ${text(order.equipment) || "Not specified"}`,
    `Equipment fee: $${number(order.equipmentFee).toFixed(2)}`,
    `Installation fee: $${number(order.installationFee).toFixed(2)}`,
    `Promotion: ${text(order.promotion) || "None entered"}`,
    `Contract: ${text(order.contract) || "Not specified"}`,
    `Installation preference: ${text(order.installationPreference) || "Not specified"}`,
    "",
    "ADVISOR",
    `Override reason: ${text(order.advisorOverrideReason) || "None"}`,
    `Special instructions: ${text(order.specialInstructions) || "None"}`,
    `Expected commission: $${number(order.expectedCommission).toFixed(2)}`,
  ];
  if (readiness.missing.length) lines.push("", `MISSING: ${readiness.missing.join(", ")}`);
  return lines.join("\n");
}

export async function findLatestQuoteForLead(leadId, quoteId = "") {
  if (!leadId && !quoteId) return null;
  const snapshot = await getDocs(query(collection(db, "quotes"), where("leadId", "==", leadId)));
  const quotes = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  if (quoteId) {
    const exact = quotes.find((item) => item.quoteId === quoteId || item.id === quoteId);
    if (exact) return exact;
  }
  return quotes.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))[0] || null;
}

export async function saveOrderIQ({ leadId, order, readiness }) {
  const now = new Date().toISOString();
  const record = {
    ...order,
    leadId,
    customerName: order.customerName,
    serviceAddress: order.serviceAddress,
    provider: order.provider,
    product: order.plan,
    monthlyRecurringRevenue: number(order.monthlyPrice),
    expectedCommission: number(order.expectedCommission),
    status: readiness.ready ? "Ready to Submit" : "Draft",
    readinessScore: readiness.score,
    missingFields: readiness.missing,
    updatedAt: serverTimestamp(),
  };
  let orderId = order.id || "";
  if (orderId) {
    await updateDoc(doc(db, "orders", orderId), record);
  } else {
    const created = await addDoc(collection(db, "orders"), { ...record, createdAt: serverTimestamp() });
    orderId = created.id;
  }
  await updateDoc(doc(db, "leads", leadId), {
    orderId,
    orderIQ: { ...order, id: orderId, status: record.status, readinessScore: readiness.score, missingFields: readiness.missing, updatedAt: now },
    status: readiness.ready ? "Order Ready" : "Customer Accepted",
    pipelineStage: readiness.ready ? "Order Ready" : "Order In Progress",
    updatedAt: serverTimestamp(),
    opportunityJournal: arrayUnion({
      id: `orderiq_${Date.now()}`,
      type: readiness.ready ? "order_ready" : "order_updated",
      title: readiness.ready ? "Order ready for DSI" : "OrderIQ draft updated",
      detail: readiness.ready ? `${order.provider} ${order.plan} is ready for manual submission.` : `Order readiness is ${readiness.score}%.`,
      createdAt: now,
      createdBy: { name: "ConnectIQ Advisor" },
    }),
  });
  return { orderId, status: record.status };
}
