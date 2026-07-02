import { carrierProfiles, findCarrierProfile } from "../data/carrierIntelligence";

function technologyScore(technology = "") {
  const tech = technology.toLowerCase();

  if (tech.includes("fiber")) return 45;
  if (tech.includes("cable")) return 30;
  if (tech.includes("fixed wireless")) return 18;
  if (tech.includes("dsl")) return 8;
  if (tech.includes("satellite")) return 2;

  return 10;
}

export function enrichProvider(provider = {}) {
  const profile = findCarrierProfile(provider.name || provider.brandName || provider.providerName);
  const download = Number(provider.download || provider.maxdown || 0);
  const upload = Number(provider.upload || provider.maxup || 0);
  const technology = provider.technology || provider.technologyType || "Broadband";

  let advisorScore = 30;
  advisorScore += technologyScore(technology);
  if (download >= 1000) advisorScore += 10;
  if (upload >= 1000) advisorScore += 10;
  if (provider.lowLatency) advisorScore += 6;
  if (profile?.dsiSupported) advisorScore += 8;
  advisorScore += profile?.scoreBoost || 0;

  return {
    ...provider,
    displayName: profile?.brand || provider.name || provider.brandName || provider.providerName || "Provider",
    carrierProfileId: profile?.id || null,
    dsiSupported: Boolean(profile?.dsiSupported),
    commissionResidential: profile?.commissionResidential || 0,
    commissionBusiness: profile?.commissionBusiness || 0,
    installEta: profile?.installEta || "Unknown",
    promotion: profile?.promotion || "No promotion loaded",
    advisorScore: Math.max(0, Math.min(100, Math.round(advisorScore))),
  };
}

export function rankCarrierOptions(providers = []) {
  return providers.map(enrichProvider).sort((a, b) => {
    return b.advisorScore - a.advisorScore || Number(b.download || 0) - Number(a.download || 0);
  });
}

export function summarizeCarrierOptions(providers = []) {
  const enriched = rankCarrierOptions(providers);

  return {
    total: enriched.length,
    dsiSupported: enriched.filter((p) => p.dsiSupported).length,
    fiber: enriched.filter((p) => String(p.technology).toLowerCase().includes("fiber")).length,
    cable: enriched.filter((p) => String(p.technology).toLowerCase().includes("cable")).length,
    fixedWireless: enriched.filter((p) => String(p.technology).toLowerCase().includes("fixed wireless")).length,
    satellite: enriched.filter((p) => String(p.technology).toLowerCase().includes("satellite")).length,
    best: enriched[0] || null,
    providers: enriched,
  };
}
