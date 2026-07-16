import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { formatCustomerReference } from "./customerCompletion";
import { buildConsentSnapshot, calculateLeadScore } from "./leadScoring";

function clean(value) { return String(value || "").trim(); }

export async function createReadyToSubmitOrder({ customer, address, providers, recommendation, quote, conversation, needs, salesSummary = null, campaign = {} }) {
  const preferences = customer?.contactPreferences || {};
  const needsEmail = Boolean(preferences.email);
  const needsPhone = Boolean(preferences.text || preferences.phone);
  if (!clean(customer?.name) || (needsEmail && !clean(customer?.email)) || (needsPhone && !clean(customer?.phone))) {
    throw new Error("Please complete the contact information for the methods you selected.");
  }
  if (!preferences.text && !preferences.phone && !preferences.email) {
    throw new Error("Please select at least one contact method.");
  }
  if (!customer?.consent) {
    throw new Error("Contact permission is required before submitting.");
  }

  const leadRef = doc(collection(db, "leads"));
  const orderRef = doc(collection(db, "orders"));
  const conversationRef = doc(collection(db, "conversations"));
  const batch = writeBatch(db);

  const customerReference = formatCustomerReference(orderRef.id);
  const consent = buildConsentSnapshot(customer);
  const leadScore = calculateLeadScore({ customer, providers, recommendation, needs });

  const shared = {
    name: clean(customer.name), email: clean(customer.email).toLowerCase(), phone: clean(customer.phone),
    address: clean(address), source: campaign.source || "AI Internet Advisor",
    campaign: campaign.campaign || "", medium: campaign.medium || "", autonomousJourney: true,
    recommendedProvider: recommendation?.displayName || recommendation?.name || "",
    recommendationSnapshot: recommendation || null, quote: quote || null, needs: needs || {},
    salesSummary: salesSummary || null,
    readinessScore: salesSummary?.advisorNotes?.readinessScore || 0,
    readinessStatus: salesSummary?.advisorNotes?.readinessStatus || "",
    nextAction: salesSummary?.advisorNotes?.nextAction || "",
    customerReference,
    contactPreferences: consent.methods,
    communicationConsent: consent,
    buyingTimeline: customer.buyingTimeline || "",
    preferredContactTime: customer.contactTime || "asap",
    futureOffersOptIn: Boolean(customer.futureOffersOptIn),
    leadScore: leadScore.score,
    leadQuality: leadScore.label,
    priority: leadScore.priority,
    consentCapturedAt: consent.capturedAt,
    updatedAt: serverTimestamp(),
  };

  batch.set(leadRef, {
    ...shared, status: "Ready to Submit", orderId: orderRef.id,
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
