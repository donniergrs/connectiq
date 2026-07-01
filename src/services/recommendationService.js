const PROVIDER_INTELLIGENCE = {
  Fiber: { baseScore: 95, latency: "Excellent", badge: "Best Technology" },
  Cable: { baseScore: 78, latency: "Good", badge: "Strong Value" },
  "Fixed Wireless": { baseScore: 68, latency: "Fair", badge: "Wireless Option" },
  DSL: { baseScore: 45, latency: "Limited", badge: "Legacy Option" },
};

export function rankProviders(providers = [], priority = "Fastest speed") {
  return providers
    .map((provider) => {
      const intel = PROVIDER_INTELLIGENCE[provider.technology] || {
        baseScore: 60,
        latency: "Unknown",
        badge: "Available",
      };

      let score = intel.baseScore;

      if (priority === "Fastest speed") score += provider.download / 100;
      if (priority === "Work from home") score += provider.upload / 100;
      if (priority === "Gaming and streaming" && provider.technology === "Fiber") score += 10;
      if (priority === "Best reliability" && provider.technology === "Fiber") score += 12;
      if (priority === "Lowest price" && provider.technology === "Cable") score += 8;

      return {
        ...provider,
        score: Math.min(Math.round(score), 100),
        latency: intel.latency,
        badge: intel.badge,
        reasons: buildReasons(provider, priority),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildReasons(provider, priority) {
  const reasons = [];

  if (provider.technology === "Fiber") {
    reasons.push("Best overall technology");
    reasons.push("Strong upload performance");
    reasons.push("Low latency for gaming and video calls");
  }

  if (provider.download >= 1000) reasons.push("Gig-speed capable");
  if (provider.upload >= 1000) reasons.push("Excellent upload speeds");
  if (priority) reasons.push(`Good match for: ${priority}`);

  return reasons.slice(0, 4);
}
