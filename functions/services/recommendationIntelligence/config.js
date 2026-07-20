export const DEFAULT_RECOMMENDATION_CONFIG = Object.freeze({
  version: "1.0.0",
  weights: { business: 0.60, customerFit: 0.40 },
  customerFitMinimum: 55,
  economics: {
    oneTimeCommissionTarget: 300,
    recurringAnnualTarget: 240,
    spiffTarget: 200,
  },
  customerFit: {
    technology: 30,
    downloadSpeed: 20,
    uploadSpeed: 15,
    latency: 10,
    reliability: 15,
    priceValue: 10,
  },
});

export function mergeRecommendationConfig(overrides = {}) {
  const weights = { ...DEFAULT_RECOMMENDATION_CONFIG.weights, ...(overrides.weights || {}) };
  const total = Number(weights.business || 0) + Number(weights.customerFit || 0);
  if (Math.abs(total - 1) > 0.0001) throw new Error("Recommendation weights must total 1.0.");
  return {
    ...DEFAULT_RECOMMENDATION_CONFIG,
    ...overrides,
    weights,
    economics: { ...DEFAULT_RECOMMENDATION_CONFIG.economics, ...(overrides.economics || {}) },
    customerFit: { ...DEFAULT_RECOMMENDATION_CONFIG.customerFit, ...(overrides.customerFit || {}) },
  };
}
