import { getProviderProfile } from "./providerIntelligence";

const TECHNOLOGY_SCORES = {
  Fiber: 45,
  Cable: 30,
  "Fixed Wireless": 20,
  DSL: 10,
};

export function rankProviders(providers = [], priority = "Fastest speed") {
  return providers
    .map((provider) => {
      const profile = getProviderProfile(provider);
      const download = Number(provider.download || provider.maxDownload || 0);
      const upload = Number(provider.upload || provider.maxUpload || 0);
      const technologyScore = TECHNOLOGY_SCORES[provider.technology] || 18;
      const downloadScore = Math.min(download / 100, 25);
      const uploadScore = Math.min(upload / 100, 20);
      const reliabilityScore = Math.min((profile.reliability || 70) / 10, 10);

      let score = technologyScore + downloadScore + uploadScore + reliabilityScore;

      if (priority === "Lowest price") score += profile.estimatedPrice <= 60 ? 12 : 0;
      if (priority === "Best reliability") score += profile.reliability >= 90 ? 12 : 0;
      if (priority === "Work from home") score += upload >= 500 ? 12 : 0;
      if (priority === "Gaming and streaming") score += profile.latencyMs <= 10 ? 12 : 0;
      if (priority === "Business internet") score += provider.technology === "Fiber" ? 14 : 0;

      const finalScore = Math.max(45, Math.min(99, Math.round(score)));

      return {
        ...profile,
        ...provider,
        score: finalScore,
        connectIqRecommendation: buildRecommendationLabel(provider, finalScore),
        reasons: buildReasons({ ...provider, ...profile, score: finalScore }, priority),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildRecommendationLabel(provider, score) {
  if (score >= 92) return "Best Overall";
  if (provider.technology === "Fiber") return "Best Fiber Option";
  if (score >= 80) return "Strong Choice";
  return "Available Option";
}

function buildReasons(provider, priority) {
  const reasons = [];

  if (provider.technology === "Fiber") reasons.push("Fiber gives the strongest balance of speed, upload, and latency.");
  if ((provider.upload || 0) >= 1000) reasons.push("Excellent upload speeds for video calls, creators, and remote work.");
  if ((provider.download || 0) >= 1000) reasons.push("Gig-speed capable for streaming, gaming, and connected homes.");
  if ((provider.latencyMs || 99) <= 10) reasons.push("Low latency makes it a strong choice for gaming and real-time applications.");
  if (provider.dataCap === "Unlimited") reasons.push("Unlimited data reduces the risk of overage concerns.");
  if (priority) reasons.push(`Best aligned to the customer's priority: ${priority}.`);

  return reasons.slice(0, 5);
}
