import { buildProviderInsights } from "./explainability.js";
import { getBestRevenueProduct } from "../../data/revenueIntelligence.js";

const MINIMUM_CUSTOMER_FIT = 70;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function providerTechnology(provider = {}) {
  return String(provider.technology || provider.technologyType || provider.technology_code_type || provider.technologyCodeType || "Broadband").trim();
}

function providerDownload(provider = {}) { return number(provider.download ?? provider.maxdown ?? provider.maxDownload); }
function providerUpload(provider = {}) { return number(provider.upload ?? provider.maxup ?? provider.maxUpload); }
function providerPrice(provider = {}) { return number(provider.monthlyPrice ?? provider.revenueProduct?.monthlyPrice ?? provider.price ?? provider.estimatedMonthlyPrice); }

function isLowLatency(provider = {}, technology = "") {
  if (typeof provider.lowLatency === "boolean") return provider.lowLatency;
  if (typeof provider.lowlatency === "boolean") return provider.lowlatency;
  return technology.includes("fiber") || technology.includes("cable");
}

function reliabilityScore(provider = {}) {
  const technology = providerTechnology(provider).toLowerCase();
  const lowLatency = isLowLatency(provider, technology);
  if (technology.includes("fiber")) return 25;
  if (technology.includes("cable")) return lowLatency ? 21 : 19;
  if (technology.includes("fixed wireless") || technology.includes("5g")) return lowLatency ? 17 : 14;
  if (technology.includes("dsl")) return 12;
  if (technology.includes("satellite")) return 7;
  return lowLatency ? 16 : 12;
}

function downloadScore(provider = {}, needs = {}) {
  const download = providerDownload(provider);
  const people = Math.max(1, number(needs.people, 2));
  const devices = Math.max(1, number(needs.devices, 5));
  const demandMultiplier = needs.streaming || needs.gaming ? 1.2 : 1;
  const target = Math.max(100, (people * 45 + devices * 8) * demandMultiplier);
  if (download >= target * 3) return 20;
  if (download >= target * 2) return 18;
  if (download >= target) return 15;
  if (download >= target * 0.7) return 10;
  if (download > 0) return 5;
  return 2;
}

function uploadScore(provider = {}, needs = {}) {
  const upload = providerUpload(provider);
  const important = needs.workFromHome || needs.creator || needs.gaming;
  if (!important) {
    if (upload >= 100) return 15;
    if (upload >= 20) return 12;
    if (upload >= 10) return 9;
    if (upload > 0) return 6;
    return 3;
  }
  if (upload >= 500) return 15;
  if (upload >= 100) return 14;
  if (upload >= 35) return 11;
  if (upload >= 20) return 8;
  if (upload > 0) return 4;
  return 1;
}

function householdScore(provider = {}, needs = {}) {
  const technology = providerTechnology(provider).toLowerCase();
  const download = providerDownload(provider);
  const upload = providerUpload(provider);
  let score = 7;
  if (needs.streaming && download >= 300) score += 3;
  if (needs.gaming && isLowLatency(provider, technology)) score += 3;
  if (needs.workFromHome && upload >= 20) score += 2;
  if (needs.creator && upload >= 100) score += 2;
  if (number(needs.devices, 5) >= 20 && download >= 500) score += 2;
  return clamp(score, 0, 15);
}

function priorityScore(provider = {}, needs = {}) {
  const technology = providerTechnology(provider).toLowerCase();
  const download = providerDownload(provider);
  const price = providerPrice(provider);
  const budget = number(needs.budget);
  const priority = String(needs.priority || "reliability").toLowerCase();
  if (priority === "speed") return download >= 1000 ? 15 : download >= 500 ? 12 : download >= 100 ? 8 : 4;
  if (priority === "price") {
    if (!price || !budget) return 9;
    if (price <= budget * 0.8) return 15;
    if (price <= budget) return 13;
    if (price <= budget * 1.15) return 8;
    return 3;
  }
  if (technology.includes("fiber")) return 15;
  if (technology.includes("cable")) return 12;
  if (technology.includes("fixed wireless") || technology.includes("5g")) return 9;
  if (technology.includes("dsl")) return 7;
  return 5;
}

function valueScore(provider = {}, needs = {}) {
  const price = providerPrice(provider);
  const budget = number(needs.budget);
  const download = providerDownload(provider);
  if (price && budget) {
    if (price <= budget * 0.85) return 10;
    if (price <= budget) return 9;
    if (price <= budget * 1.15) return 6;
    return 2;
  }
  if (price && download) {
    const value = price / Math.max(1, download / 100);
    return value <= 8 ? 9 : value <= 15 ? 7 : 5;
  }
  return 6;
}

export function scoreProvider(provider = {}, needs = {}) {
  const breakdown = {
    reliability: reliabilityScore(provider),
    speed: downloadScore(provider, needs),
    uploadFit: uploadScore(provider, needs),
    householdFit: householdScore(provider, needs),
    priorityFit: priorityScore(provider, needs),
    value: valueScore(provider, needs),
  };
  return { ...breakdown, total: Object.values(breakdown).reduce((sum, score) => sum + score, 0) };
}

function simpleReasons(provider = {}, needs = {}) {
  const download = providerDownload(provider);
  const reasons = [];
  if (needs.streaming) reasons.push("Everyone should be able to watch shows without slowing each other down.");
  if (needs.workFromHome) reasons.push("Strong upload capacity helps work and video calls stay smooth.");
  if (needs.gaming) reasons.push("Games should feel quick and responsive.");
  if (number(needs.devices) >= 20) reasons.push("It can handle lots of phones, TVs, and other devices at once.");
  if (String(needs.priority).toLowerCase() === "price") reasons.push("It is a strong choice for the budget you picked.");
  if (String(needs.priority).toLowerCase() === "reliability") reasons.push("It is one of the stronger choices for a steady connection.");
  if (String(needs.priority).toLowerCase() === "speed") reasons.push("It gives your home plenty of room for busy internet days.");
  if (!reasons.length && download >= 300) reasons.push("It has enough speed for everyday family use.");
  reasons.push("It gives your home room to grow without making things complicated.");
  return [...new Set(reasons)].slice(0, 3);
}

function recommendationTier(score) {
  if (score >= 90) return "Great Match";
  if (score >= 80) return "Strong Match";
  if (score >= 70) return "Good Match";
  return "Available Option";
}

function enrich(provider = {}, needs = {}) {
  const scoreBreakdown = scoreProvider(provider, needs);
  const customerFitScore = clamp(scoreBreakdown.total);
  const revenueProduct = getBestRevenueProduct(provider);
  const businessValue = number(revenueProduct?.annualRevenueOpportunity);
  const reasons = simpleReasons(provider, needs);
  const technology = providerTechnology(provider);
  return {
    ...provider,
    technology,
    download: providerDownload(provider),
    upload: providerUpload(provider),
    displayName: provider.displayName || provider.name || provider.brandName || provider.providerName || "Available Provider",
    customerFitScore,
    customerScore: customerFitScore,
    advisorScore: customerFitScore,
    businessValue,
    revenueProduct,
    qualifiesForRecommendation: customerFitScore >= MINIMUM_CUSTOMER_FIT,
    recommendationTier: recommendationTier(customerFitScore),
    recommendationReasons: reasons,
    recommendationReason: reasons[0],
    scoreBreakdown,
    insights: buildProviderInsights({ ...provider, technology }, needs),
  };
}

export function rankProviders(providers = [], needs = {}) {
  const enriched = providers.map((provider) => enrich(provider, needs));
  const qualified = enriched.filter((provider) => provider.qualifiesForRecommendation);
  const candidates = qualified.length ? qualified : enriched;
  return candidates.sort((a, b) =>
    b.businessValue - a.businessValue ||
    b.customerFitScore - a.customerFitScore ||
    b.download - a.download,
  );
}

export function selectRecommendation(providers = [], needs = {}) {
  return rankProviders(providers, needs)[0] || null;
}

export { MINIMUM_CUSTOMER_FIT };
