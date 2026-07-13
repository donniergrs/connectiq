import { buildProviderInsights } from "./explainability.js";

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function providerTechnology(provider = {}) {
  return String(
    provider.technology ||
      provider.technologyType ||
      provider.technology_code_type ||
      provider.technologyCodeType ||
      "Broadband",
  ).trim();
}

function providerDownload(provider = {}) {
  return number(provider.download ?? provider.maxdown ?? provider.maxDownload);
}

function providerUpload(provider = {}) {
  return number(provider.upload ?? provider.maxup ?? provider.maxUpload);
}

function providerPrice(provider = {}) {
  return number(
    provider.monthlyPrice ??
      provider.revenueProduct?.monthlyPrice ??
      provider.price ??
      provider.estimatedMonthlyPrice,
  );
}

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
  const uploadSensitive = needs.workFromHome || needs.creator || needs.gaming;

  if (!uploadSensitive) {
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
  const lowLatency = isLowLatency(provider, technology);
  let score = 7;

  if (needs.streaming && download >= 300) score += 3;
  if (needs.gaming && lowLatency) score += 3;
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

  if (priority === "speed") {
    if (download >= 2000) return 15;
    if (download >= 1000) return 14;
    if (download >= 500) return 11;
    if (download >= 100) return 8;
    return 4;
  }

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
    const dollarsPerHundredMbps = price / Math.max(1, download / 100);
    if (dollarsPerHundredMbps <= 8) return 9;
    if (dollarsPerHundredMbps <= 15) return 7;
    return 5;
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

  return {
    ...breakdown,
    total: Object.values(breakdown).reduce((sum, score) => sum + score, 0),
  };
}

function personalizedReasons(provider = {}, needs = {}, breakdown = {}) {
  const technology = providerTechnology(provider);
  const tech = technology.toLowerCase();
  const download = providerDownload(provider);
  const upload = providerUpload(provider);
  const price = providerPrice(provider);
  const budget = number(needs.budget);
  const reasons = [];

  if (tech.includes("fiber")) reasons.push("Fiber is the strongest reliability and upload option available at this address.");
  if (needs.workFromHome && upload >= 20) reasons.push(`${upload} Mbps upload supports video calls, cloud work, and file sharing.`);
  if (needs.gaming && isLowLatency(provider, tech)) reasons.push("Its connection type is well suited to lower-latency online gaming.");
  if (needs.streaming && download >= 300) reasons.push(`${download} Mbps download provides room for simultaneous HD and 4K streaming.`);
  if (number(needs.devices) >= 20 && download >= 500) reasons.push("The available speed is a strong fit for a high-device household.");
  if (price && budget && price <= budget) reasons.push(`The estimated monthly price fits your ${Math.round(budget)} dollar target budget.`);
  if (String(needs.priority).toLowerCase() === "speed" && breakdown.speed >= 18) reasons.push("It earns one of the highest speed scores among the verified options.");
  if (String(needs.priority).toLowerCase() === "price" && breakdown.priorityFit >= 13) reasons.push("It ranks strongly for the price priority you selected.");
  if (!reasons.length) reasons.push("It offers the best overall balance of verified technology, speed, and household fit.");

  return reasons.slice(0, 4);
}

function recommendationTier(score) {
  if (score >= 90) return "Excellent match";
  if (score >= 80) return "Strong match";
  if (score >= 70) return "Good match";
  return "Available option";
}

export function enrichRecommendation(provider = {}, needs = {}) {
  const scoreBreakdown = scoreProvider(provider, needs);
  const advisorScore = clamp(scoreBreakdown.total);
  const reasons = personalizedReasons(provider, needs, scoreBreakdown);
  const technology = providerTechnology(provider);

  return {
    ...provider,
    technology,
    download: providerDownload(provider),
    upload: providerUpload(provider),
    displayName: provider.displayName || provider.name || provider.brandName || provider.providerName || "Available Provider",
    customerScore: advisorScore,
    advisorScore,
    recommendationTier: recommendationTier(advisorScore),
    recommendationReasons: reasons,
    recommendationReason: reasons[0],
    scoreBreakdown,
    insights: buildProviderInsights({ ...provider, technology }, needs),
  };
}

export function rankProviders(providers = [], needs = {}) {
  return providers
    .map((provider) => enrichRecommendation(provider, needs))
    .sort((a, b) =>
      b.advisorScore - a.advisorScore ||
      b.scoreBreakdown.reliability - a.scoreBreakdown.reliability ||
      b.download - a.download ||
      b.upload - a.upload,
    );
}

export function selectRecommendation(providers = [], needs = {}) {
  return rankProviders(providers, needs)[0] || null;
}
