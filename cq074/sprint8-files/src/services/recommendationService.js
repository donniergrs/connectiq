import { getProviderIntel } from "./providerIntelligence";

const TECHNOLOGY_INTELLIGENCE = {
  Fiber: { baseScore: 95, latency: "Very Low", badge: "Best Technology" },
  Cable: { baseScore: 78, latency: "Moderate", badge: "Strong Value" },
  "Fixed Wireless": { baseScore: 68, latency: "Variable", badge: "Wireless Option" },
  DSL: { baseScore: 45, latency: "Limited", badge: "Legacy Option" },
};

export function rankProviders(providers = [], priority = "Fastest speed") {
  return providers
    .map((provider) => enrichProvider(provider, priority))
    .sort((a, b) => b.score - a.score);
}

export function enrichProvider(provider, priority = "Fastest speed") {
  const providerIntel = getProviderIntel(provider.name);
  const technologyIntel = TECHNOLOGY_INTELLIGENCE[provider.technology] || {
    baseScore: 60,
    latency: "Unknown",
    badge: "Available",
  };

  let score = technologyIntel.baseScore;
  const download = Number(provider.download || 0);
  const upload = Number(provider.upload || 0);

  if (priority === "Fastest speed") score += Math.min(download / 100, 25);
  if (priority === "Work from home") score += Math.min(upload / 100, 25);
  if (priority === "Gaming and streaming" && provider.technology === "Fiber") score += 10;
  if (priority === "Best reliability" && provider.technology === "Fiber") score += 12;
  if (priority === "Lowest price" && provider.technology === "Cable") score += 8;
  if (providerIntel?.technology?.includes("Fiber")) score += 3;

  return {
    ...provider,
    score: Math.min(Math.round(score), 100),
    latency: providerIntel?.latency || technologyIntel.latency,
    badge: technologyIntel.badge,
    installEta: providerIntel?.installEta || "Verify with provider",
    typicalCommission: providerIntel?.typicalCommission || 0,
    customerFit: providerIntel?.customerFit || [],
    advisorNotes: providerIntel?.notes || "Verify local availability, pricing, and installation timing before quoting.",
    reasons: buildReasons(provider, priority, providerIntel),
  };
}

function buildReasons(provider, priority, providerIntel) {
  const reasons = [];

  if (provider.technology === "Fiber") {
    reasons.push("Fiber is the best long-term technology choice");
    reasons.push("Strong upload performance for video calls and cloud work");
    reasons.push("Low latency for gaming, streaming, and remote work");
  }

  if (provider.download >= 1000) reasons.push("Gig-speed capable service");
  if (provider.upload >= 1000) reasons.push("Excellent upload speeds");
  if (providerIntel?.installEta) reasons.push(`Estimated install window: ${providerIntel.installEta}`);
  if (priority) reasons.push(`Good match for: ${priority}`);

  return reasons.slice(0, 5);
}
