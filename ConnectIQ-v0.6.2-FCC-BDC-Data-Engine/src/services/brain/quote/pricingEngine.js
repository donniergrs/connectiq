function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function estimateMonthlyPrice(plan = {}, provider = {}) {
  const providerPrice = number(
    provider.revenueProduct?.monthlyPrice ?? provider.monthlyPrice ?? provider.price ?? provider.estimatedMonthlyPrice,
  );
  const planPrice = number(plan.estimatedMonthlyPrice ?? plan.monthlyPrice ?? plan.price);
  const amount = providerPrice || planPrice || 79.99;
  const source = providerPrice ? "provider-data" : planPrice ? "curated-estimate" : "fallback-estimate";

  return {
    amount: Math.round(amount * 100) / 100,
    currency: "USD",
    estimated: true,
    source,
    label: source === "provider-data" ? "Provider-supplied estimate" : "ConnectIQ planning estimate",
    disclaimer: "Estimated only. Final plan price, taxes, equipment, promotions, eligibility, and fees require provider confirmation.",
  };
}

export function estimateFirstMonth(monthlyPrice = 0, installationFee = 0, equipmentFee = 0) {
  return Math.round((number(monthlyPrice) + number(installationFee) + number(equipmentFee)) * 100) / 100;
}
