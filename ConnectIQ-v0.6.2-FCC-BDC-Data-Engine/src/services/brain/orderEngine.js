import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { formatCustomerReference } from "./customerCompletion";

function clean(value) { return String(value || "").trim(); }

export async function createReadyToSubmitOrder({ customer, address, providers, recommendation, quote, conversation, needs, salesSummary = null, campaign = {} }) {
  if (!clean(customer?.name) || !clean(customer?.email) || !clean(customer?.phone)) {
    throw new Error("Name, email, and phone are required.");
  }

  const leadRef = doc(collection(db, "leads"));
  const orderRef = doc(collection(db, "orders"));
  const conversationRef = doc(collection(db, "conversations"));
  const batch = writeBatch(db);

  const customerReference = formatCustomerReference(orderRef.id);

  const shared = {
    name: clean(customer.name), email: clean(customer.email).toLowerCase(), phone: clean(customer.phone),
    address: clean(address), source: campaign.source || "AI Internet Advisor",
    campaign: campaign.campaign || "", medium: campaign.medium || "", autonomousJourney: true,
    recommendedProvider: recommendation?.displayName || recommendation?.name || "",
    recommendationSnapshot: recommendation || null, quote: quote || null, needs: needs || {},
    salesSummary: salesSummary || null,
    leadQuality: salesSummary?.advisorNotes?.leadQuality || "",
    readinessScore: salesSummary?.advisorNotes?.readinessScore || 0,
    readinessStatus: salesSummary?.advisorNotes?.readinessStatus || "",
    nextAction: salesSummary?.advisorNotes?.nextAction || "",
    customerReference,
    updatedAt: serverTimestamp(),
  };

  batch.set(leadRef, {
    ...shared, status: "Ready to Submit", priority: "High", orderId: orderRef.id,
    providerCount: providers?.length || 0, providers: providers || [], createdAt: serverTimestamp(),
    activity: [{ type: "AI Sale Qualified", status: "Ready to Submit", note: "Customer completed the ConnectIQ guided buying flow.", createdAt: new Date().toISOString() }],
  });

  batch.set(orderRef, {
    ...shared, leadId: leadRef.id, conversationId: conversationRef.id,
    status: "Ready to Submit", fulfillmentStatus: "Awaiting manual DSI submission",
    provider: recommendation?.displayName || "", product: quote?.productName || "",
    estimatedMonthlyPrice: quote?.monthlyPrice || 0, createdAt: serverTimestamp(),
  });

  batch.set(conversationRef, {
    leadId: leadRef.id, orderId: orderRef.id, address: clean(address), messages: conversation || [],
    channel: "web", status: "converted", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { id: orderRef.id, orderId: orderRef.id, leadId: leadRef.id, conversationId: conversationRef.id, status: "Ready to Submit", ...shared };
}
