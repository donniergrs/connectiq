function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildScoreBreakdown(provider = {}, needs = {}) {
  const tech = String(provider.technology || "Broadband").toLowerCase();
  const download = number(provider.download || provider.maxdown);
  const upload = number(provider.upload || provider.maxup);
  const fiber = tech.includes("fiber");
  const cable = tech.includes("cable");

  const reliability = Math.min(30, fiber ? 30 : cable ? 23 : provider.lowLatency ? 20 : 14);
  const speed = Math.min(25, download >= 2000 ? 25 : download >= 1000 ? 22 : download >= 500 ? 18 : download >= 100 ? 13 : 7);
  const uploadFit = Math.min(20, upload >= 500 ? 20 : upload >= 100 ? 17 : upload >= 20 ? 12 : 6);
  const householdFit = Math.min(15,
    7 +
    (needs.streaming && download >= 300 ? 3 : 0) +
    (needs.gaming && (provider.lowLatency || fiber) ? 3 : 0) +
    (needs.workFromHome && upload >= 20 ? 2 : 0)
  );
  const value = Math.min(10, provider.revenueProduct?.monthlyPrice || provider.monthlyPrice ? 8 : 6);

  return {
    reliability,
    speed,
    uploadFit,
    householdFit,
    value,
    total: reliability + speed + uploadFit + householdFit + value,
  };
}

export function buildProviderInsights(provider = {}, needs = {}) {
  const technology = String(provider.technology || "Broadband");
  const tech = technology.toLowerCase();
  const download = number(provider.download || provider.maxdown);
  const upload = number(provider.upload || provider.maxup);
  const pros = [];
  const cons = [];

  if (tech.includes("fiber")) pros.push("Excellent reliability and symmetrical-speed potential");
  if (download >= 1000) pros.push("Strong capacity for multi-device households");
  if (upload >= 100) pros.push("Excellent upload performance for remote work and creators");
  if (needs.gaming && (provider.lowLatency || tech.includes("fiber"))) pros.push("Strong fit for low-latency gaming");
  if (tech.includes("cable")) cons.push("Upload speeds are typically lower than fiber");
  if (tech.includes("wireless")) cons.push("Performance may vary with signal and congestion");
  if (tech.includes("satellite")) cons.push("Higher latency can affect gaming and video calls");
  if (!provider.monthlyPrice && !provider.revenueProduct?.monthlyPrice) cons.push("Final plan pricing requires provider confirmation");

  return {
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 2),
    bestFor: tech.includes("fiber") ? "Reliability, remote work, and demanding homes" : download >= 1000 ? "Streaming and larger households" : "Everyday browsing and value-focused households",
  };
}

export function recommendationConfidence(ranked = []) {
  if (!ranked.length) return 0;
  if (ranked.length === 1) return 96;
  const gap = number(ranked[0].advisorScore) - number(ranked[1].advisorScore);
  return Math.max(72, Math.min(98, 82 + gap * 2));
}
