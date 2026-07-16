const DEFAULT_WEIGHTS = Object.freeze({ revenue: 0.6, customer: 0.4 });

function clamp(value) { return Math.max(0, Math.min(100, Number(value || 0))); }

function technologyFit(provider, needs = {}) {
  const tech = String(provider.technology || "").toLowerCase();
  let score = tech.includes("fiber") ? 92 : tech.includes("cable") ? 78 : tech.includes("wireless") ? 66 : tech.includes("dsl") ? 48 : 55;
  if ((needs.workFromHome || needs.creator) && tech.includes("fiber")) score += 6;
  if (needs.gaming && (tech.includes("fiber") || tech.includes("cable"))) score += 4;
  return clamp(score);
}

export function scoreProvider(provider, needs = {}, revenue = {}, weights = DEFAULT_WEIGHTS) {
  const commission = Number(revenue.commission ?? provider.commission ?? 0);
  const spiff = Number(revenue.spiff ?? provider.spiff ?? 0);
  const monthlyRecurring = Number(revenue.monthlyRecurring ?? provider.monthlyRecurring ?? 0);
  const lifetimeMonths = Number(revenue.lifetimeMonths ?? 24);
  const expectedRevenue = commission + spiff + (monthlyRecurring * lifetimeMonths);
  const revenueScore = clamp(expectedRevenue ? 35 + Math.min(expectedRevenue / 8, 65) : 50);
  const confidence = Number(provider.confidence || (provider.verified ? 100 : 65));
  const customerScore = clamp((technologyFit(provider, needs) * 0.65) + (confidence * 0.35));
  const finalScore = Math.round((revenueScore * weights.revenue) + (customerScore * weights.customer));
  return { ...provider, revenueScore: Math.round(revenueScore), customerScore: Math.round(customerScore), score: finalScore, expectedRevenue, weights };
}

export function rankProviderOptions(providers = [], needs = {}, revenueCatalog = {}, weights = DEFAULT_WEIGHTS) {
  return providers.map((provider) => scoreProvider(provider, needs, revenueCatalog[provider.name] || {}, weights)).sort((a, b) => b.score - a.score);
}

export { DEFAULT_WEIGHTS };
