function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function customerScore(provider = {}) {
  const technology = String(provider.technology || provider.technologyType || "").toLowerCase();
  const download = number(provider.download || provider.maxdown);
  const upload = number(provider.upload || provider.maxup);

  let score = 35;
  if (technology.includes("fiber")) score += 40;
  else if (technology.includes("cable")) score += 24;
  else if (technology.includes("fixed wireless")) score += 14;
  else if (technology.includes("satellite")) score += 2;

  if (download >= 1000) score += 12;
  else if (download >= 300) score += 8;
  else if (download >= 100) score += 4;

  if (upload >= 1000) score += 10;
  else if (upload >= 100) score += 6;
  else if (upload >= 20) score += 3;

  if (provider.lowLatency) score += 3;
  return Math.min(100, Math.round(score));
}

function revenueScore(provider = {}) {
  if (Number.isFinite(Number(provider.revenueScore))) return Number(provider.revenueScore);

  const opportunity = number(
    provider.annualRevenueOpportunity ||
      provider.revenueProduct?.annualRevenueOpportunity ||
      provider.commission ||
      provider.commissionResidential
  );

  if (opportunity >= 500) return 100;
  if (opportunity >= 400) return 92;
  if (opportunity >= 300) return 82;
  if (opportunity >= 200) return 70;
  if (opportunity >= 100) return 55;
  return 35;
}

export function enrichRecommendation(provider = {}) {
  const computedCustomer = Number.isFinite(Number(provider.customerScore))
    ? Number(provider.customerScore)
    : customerScore(provider);
  const computedRevenue = revenueScore(provider);
  const overall = Number.isFinite(Number(provider.advisorScore))
    ? Number(provider.advisorScore)
    : Math.round(computedRevenue * 0.7 + computedCustomer * 0.3);

  return {
    ...provider,
    displayName:
      provider.displayName ||
      provider.name ||
      provider.brandName ||
      provider.providerName ||
      "Available Provider",
    customerScore: computedCustomer,
    revenueScore: computedRevenue,
    advisorScore: overall,
  };
}

export function rankProviders(providers = []) {
  return providers
    .map(enrichRecommendation)
    .sort(
      (a, b) =>
        b.advisorScore - a.advisorScore ||
        b.revenueScore - a.revenueScore ||
        Number(b.download || 0) - Number(a.download || 0)
    );
}

export function selectRecommendation(providers = []) {
  return rankProviders(providers)[0] || null;
}
