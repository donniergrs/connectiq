function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function technology(provider = {}) {
  return String(provider.technology || provider.technologyType || provider.technology_code_type || "Broadband");
}

export function buildScoreBreakdown(provider = {}) {
  if (provider.scoreBreakdown) return provider.scoreBreakdown;
  return {
    reliability: 0,
    speed: 0,
    uploadFit: 0,
    householdFit: 0,
    priorityFit: 0,
    value: 0,
    total: 0,
  };
}

export function buildProviderInsights(provider = {}, needs = {}) {
  const techLabel = technology(provider);
  const tech = techLabel.toLowerCase();
  const download = number(provider.download || provider.maxdown);
  const upload = number(provider.upload || provider.maxup);
  const pros = [];
  const cons = [];

  if (tech.includes("fiber")) pros.push("Excellent reliability and symmetrical-speed potential");
  if (download >= 1000) pros.push("Strong capacity for multi-device households");
  else if (download >= 300) pros.push("Good capacity for simultaneous streaming and browsing");
  if (upload >= 100) pros.push("Excellent upload performance for remote work and creators");
  if (needs.gaming && (provider.lowLatency || provider.lowlatency || tech.includes("fiber"))) pros.push("Strong fit for lower-latency gaming");

  if (tech.includes("cable")) cons.push("Upload speeds are typically lower than fiber");
  if (tech.includes("wireless") || tech.includes("5g")) cons.push("Performance may vary with signal strength and local congestion");
  if (tech.includes("satellite")) cons.push("Higher latency can affect gaming and real-time video calls");
  if (download && download < 100) cons.push("May be limiting for larger or high-usage households");
  if (!provider.monthlyPrice && !provider.revenueProduct?.monthlyPrice) cons.push("Final plan pricing requires provider confirmation");

  return {
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 2),
    bestFor: tech.includes("fiber")
      ? "Reliability, remote work, gaming, and demanding homes"
      : download >= 1000
        ? "Streaming and larger multi-device households"
        : tech.includes("wireless") || tech.includes("5g")
          ? "Flexible installation and everyday household use"
          : "Everyday browsing and value-focused households",
  };
}

function providerDataQuality(provider = {}) {
  const fields = [
    technology(provider) !== "Broadband",
    number(provider.download || provider.maxdown) > 0,
    number(provider.upload || provider.maxup) > 0,
    Boolean(provider.displayName || provider.name || provider.brandName || provider.providerName),
  ];
  return fields.filter(Boolean).length / fields.length;
}

export function recommendationConfidence(ranked = []) {
  if (!ranked.length) return 0;
  const top = ranked[0];
  const second = ranked[1];
  const gap = second ? number(top.advisorScore) - number(second.advisorScore) : 12;
  const quality = providerDataQuality(top);
  const competitionBonus = ranked.length >= 3 ? 3 : ranked.length === 2 ? 1 : 0;
  const raw = 72 + Math.min(14, Math.max(0, gap) * 1.5) + quality * 10 + competitionBonus;
  return Math.max(70, Math.min(98, Math.round(raw)));
}
