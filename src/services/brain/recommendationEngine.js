import { buildProviderInsights, buildScoreBreakdown } from "./explainability";
function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedTechnology(provider = {}) {
  return String(provider.technology || provider.technologyType || "Broadband").toLowerCase();
}

function fitScore(provider = {}, needs = {}) {
  const technology = normalizedTechnology(provider);
  const download = number(provider.download || provider.maxdown);
  const upload = number(provider.upload || provider.maxup);
  const people = number(needs.people, 2);
  const devices = number(needs.devices, 5);

  let score = 38;
  if (technology.includes("fiber")) score += 36;
  else if (technology.includes("cable")) score += 23;
  else if (technology.includes("fixed wireless")) score += 13;
  else if (technology.includes("dsl")) score += 5;
  else if (technology.includes("satellite")) score -= 2;

  const targetDownload = Math.max(100, people * 50 + devices * 10);
  if (download >= targetDownload * 2) score += 12;
  else if (download >= targetDownload) score += 8;
  else if (download >= targetDownload * 0.6) score += 3;
  else score -= 8;

  if (needs.workFromHome || needs.gaming || needs.creator) {
    if (upload >= 100) score += 8;
    else if (upload >= 20) score += 4;
    else score -= 5;
  }

  if (needs.gaming && provider.lowLatency) score += 4;
  if (needs.streaming && download >= 300) score += 4;
  if (needs.reliability && technology.includes("fiber")) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
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

function reasonFor(provider, needs = {}) {
  const technology = provider.technology || "broadband";
  const reasons = [];
  if (String(technology).toLowerCase().includes("fiber")) reasons.push("fiber reliability and strong upload performance");
  if (needs.gaming && provider.lowLatency) reasons.push("low-latency gaming");
  if (needs.workFromHome && Number(provider.upload || 0) >= 100) reasons.push("video calls and work-from-home capacity");
  if (needs.streaming && Number(provider.download || 0) >= 300) reasons.push("multi-device streaming");
  if (!reasons.length) reasons.push("the best overall balance of speed and availability");
  return `Recommended for ${reasons.slice(0, 2).join(" and ")}.`;
}

export function enrichRecommendation(provider = {}, needs = {}) {
  const customerScore = fitScore(provider, needs);
  const computedRevenue = revenueScore(provider);
  const advisorScore = Math.round(customerScore * 0.7 + computedRevenue * 0.3);

  return {
    ...provider,
    displayName: provider.displayName || provider.name || provider.brandName || provider.providerName || "Available Provider",
    customerScore,
    revenueScore: computedRevenue,
    advisorScore,
    recommendationReason: reasonFor(provider, needs),
    scoreBreakdown: buildScoreBreakdown(provider, needs),
    insights: buildProviderInsights(provider, needs),
  };
}

export function rankProviders(providers = [], needs = {}) {
  return providers
    .map((provider) => enrichRecommendation(provider, needs))
    .sort((a, b) =>
      b.advisorScore - a.advisorScore ||
      b.customerScore - a.customerScore ||
      Number(b.download || 0) - Number(a.download || 0)
    );
}

export function selectRecommendation(providers = [], needs = {}) {
  return rankProviders(providers, needs)[0] || null;
}
