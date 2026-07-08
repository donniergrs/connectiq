import { findCarrierProfile } from "../data/carrierIntelligence";
import { getBestRevenueProduct } from "../data/revenueIntelligence";

const DEFAULT_REVENUE_WEIGHT = 0.7;
const DEFAULT_CUSTOMER_WEIGHT = 0.3;

function technologyScore(technology = "") {
  const tech = technology.toLowerCase();

  if (tech.includes("fiber")) return 100;
  if (tech.includes("cable")) return 72;
  if (tech.includes("fixed wireless")) return 55;
  if (tech.includes("dsl")) return 35;
  if (tech.includes("satellite")) return 20;

  return 40;
}

function calculateCustomerScore(provider = {}) {
  const download = Number(provider.download || provider.maxdown || 0);
  const upload = Number(provider.upload || provider.maxup || 0);
  const technology = provider.technology || provider.technologyType || "Broadband";

  let score = 0;
  score += technologyScore(technology) * 0.45;
  score += Math.min(download / 50, 25);
  score += Math.min(upload / 50, 20);
  if (provider.lowLatency) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateRevenueScore(profile = {}) {
  const residential = Number(profile?.commissionResidential || 0);
  const business = Number(profile?.commissionBusiness || 0);

  let score = 0;
  score += Math.min(residential / 2, 45);
  score += Math.min(business / 5, 35);
  if (profile?.dsiSupported) score += 15;
  if (profile?.scoreBoost) score += profile.scoreBoost;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function enrichProvider(provider = {}) {
  const profile = findCarrierProfile(provider.name || provider.brandName || provider.providerName);
  const customerScore = calculateCustomerScore(provider);
  const bestRevenueProduct = getBestRevenueProduct({
    ...provider,
    carrierProfileId: profile?.id,
    displayName: profile?.brand,
  });

  const revenueScore = bestRevenueProduct
    ? Math.min(100, Math.round(bestRevenueProduct.annualRevenueOpportunity / 5))
    : calculateRevenueScore(profile);

  const advisorScore = Math.round(
    revenueScore * DEFAULT_REVENUE_WEIGHT +
    customerScore * DEFAULT_CUSTOMER_WEIGHT
  );

  return {
    ...provider,
    displayName: profile?.brand || provider.name || provider.brandName || provider.providerName || "Provider",
    carrierProfileId: profile?.id || null,
    dsiSupported: Boolean(profile?.dsiSupported),
    commissionResidential: profile?.commissionResidential || 0,
    commissionBusiness: profile?.commissionBusiness || 0,
    installEta: profile?.installEta || "Unknown",
    promotion: profile?.promotion || "No promotion loaded",
    revenueProduct: bestRevenueProduct,
    annualRevenueOpportunity: bestRevenueProduct?.annualRevenueOpportunity || 0,
    revenueScore,
    customerScore,
    advisorScore,
    recommendationWeights: {
      revenue: 70,
      customer: 30,
    },
  };
}

export function rankCarrierOptions(providers = []) {
  return providers.map(enrichProvider).sort((a, b) => {
    return b.advisorScore - a.advisorScore || b.revenueScore - a.revenueScore;
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
