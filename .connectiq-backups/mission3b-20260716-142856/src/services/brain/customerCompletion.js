function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function formatCustomerReference(orderId) {
  const normalized = safeText(orderId).replace(/[^a-z0-9]/gi, "").toUpperCase();
  const suffix = (normalized || "PENDING").slice(-6).padStart(6, "0");
  return `CIQ-${suffix}`;
}

export function buildCustomerCompletion({ order, recommendation, quote, customer } = {}) {
  const referenceNumber = safeText(order?.customerReference) || formatCustomerReference(order?.id || order?.orderId);
  return {
    schema: "connectiq.customer-completion.v1",
    referenceNumber,
    customerName: safeText(customer?.name || order?.name, "Customer"),
    provider: safeText(recommendation?.displayName || recommendation?.name || order?.recommendedProvider, "Provider pending confirmation"),
    plan: safeText(quote?.recommendedPlan?.name || quote?.productName || order?.product, "Plan pending confirmation"),
    monthlyPrice: Number(quote?.monthlyPrice ?? order?.estimatedMonthlyPrice ?? 0),
    pricingLabel: safeText(quote?.pricing?.sourceLabel || quote?.status, "Estimated pricing"),
    nextSteps: [
      "A ConnectIQ advisor will review your recommendation.",
      "Current promotions, eligibility, and final availability will be verified.",
      "We will contact you to complete the next step of your order.",
    ],
    disclaimer: safeText(
      quote?.disclaimer,
      "Final pricing, promotions, eligibility, and installation timing require provider confirmation."
    ),
  };
}

export function containsInternalAdvisorData(completion = {}) {
  const forbidden = [
    "readinessScore",
    "readinessStatus",
    "leadQuality",
    "likelyObjection",
    "primarySellingPoint",
    "suggestedTalkingPoints",
    "exportPayload",
    "advisorNotes",
  ];
  return forbidden.some((key) => Object.prototype.hasOwnProperty.call(completion, key));
}
