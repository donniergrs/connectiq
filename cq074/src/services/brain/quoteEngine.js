export { buildIntelligentQuote, selectRecommendedPlan } from "./quote/quoteEngine.js";
export { plansForProvider, catalogTechnologyKey, TECHNOLOGY_CATALOG } from "./quote/productCatalog.js";
export { estimateMonthlyPrice, estimateFirstMonth } from "./quote/pricingEngine.js";
export { installationGuidance, INSTALLATION_GUIDANCE } from "./quote/installationEngine.js";

import { buildIntelligentQuote } from "./quote/quoteEngine.js";

// Backward-compatible façade used by the existing Advisor UI and order engine.
export function buildQuote(input) {
  return buildIntelligentQuote(input);
}
