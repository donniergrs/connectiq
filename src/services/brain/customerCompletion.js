function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function formatCustomerReference(sourceId, date = new Date()) {
  const normalized = safeText(sourceId).replace(/[^a-z0-9]/gi, "").toUpperCase();
  const suffix = (normalized || "PENDING").slice(-6).padStart(6, "0");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `CQ-${year}${month}${day}-${suffix}`;
}

function contactMethods(customer = {}, order = {}) {
  const preferences = customer?.contactPreferences || order?.contactPreferences || {};
  return Object.entries(preferences)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key === "text" ? "Text message" : key === "phone" ? "Phone call" : "Email");
}

export function buildCustomerCompletion({ order, recommendation, quote, customer } = {}) {
  const referenceNumber = safeText(order?.customerReference) || formatCustomerReference(order?.leadId || order?.id || order?.orderId);
  const methods = contactMethods(customer, order);
  return {
    schema: "connectiq.customer-completion.v2",
    referenceNumber,
    customerName: safeText(customer?.name || order?.name, "Customer"),
    provider: safeText(recommendation?.displayName || recommendation?.name || order?.recommendedProvider, "Provider pending confirmation"),
    plan: safeText(quote?.recommendedPlan?.name || quote?.productName || recommendation?.revenueProduct?.productName || order?.product, "Plan pending confirmation"),
    monthlyPrice: Number(quote?.monthlyPrice ?? order?.estimatedMonthlyPrice ?? 0),
    pricingLabel: safeText(quote?.pricing?.sourceLabel || quote?.status, "Estimated pricing"),
    contactMethods: methods,
    responseExpectation: "Within 30 minutes during business hours",
    nextSteps: [
      "We verify the provider, plan, and current offer at your address.",
      `A ConnectIQ Advisor contacts you${methods.length ? ` by ${methods.join(" or ")}` : " using your preferred method"}.`,
      "We help you complete your internet order.",
    ],
    disclaimer: safeText(quote?.disclaimer, "Final pricing, promotions, eligibility, and installation timing require provider confirmation."),
  };
}

export function containsInternalAdvisorData(completion = {}) {
  const forbidden = ["readinessScore", "readinessStatus", "leadQuality", "likelyObjection", "primarySellingPoint", "suggestedTalkingPoints", "exportPayload", "advisorNotes"];
  return forbidden.some((key) => Object.prototype.hasOwnProperty.call(completion, key));
}
