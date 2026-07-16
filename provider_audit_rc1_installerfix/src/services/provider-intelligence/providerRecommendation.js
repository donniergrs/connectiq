import { rankProviders } from "../brain/recommendationEngine.js";

function carrierKey(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function verifiedProvidersOnly(providers = []) {
  return (Array.isArray(providers) ? providers : []).filter((provider) => provider?.verified === true);
}

export function excludeCurrentCarrier(providers = [], currentCarrier = "") {
  const current = carrierKey(currentCarrier);
  if (!current) return providers;
  return providers.filter((provider) => {
    const name = carrierKey(provider.displayName || provider.name || provider.brandName || provider.providerName);
    return !name.includes(current) && !current.includes(name);
  });
}

export function buildVerifiedRecommendation(providers = [], { currentCarrier = "", needs = {} } = {}) {
  const verified = verifiedProvidersOnly(providers);
  const eligible = excludeCurrentCarrier(verified, currentCarrier);

  if (!verified.length) {
    return {
      status: "no_verified_providers",
      recommendation: null,
      alternative: null,
      eligibleProviders: [],
      explanation: "No verified provider data was returned. ConnectIQ did not create a fallback recommendation.",
    };
  }

  if (!eligible.length) {
    return {
      status: "current_carrier_only",
      recommendation: null,
      alternative: null,
      eligibleProviders: [],
      explanation: "The only verified option matched the customer's current carrier.",
    };
  }

  const ranked = rankProviders(eligible, needs);
  return {
    status: "recommended",
    recommendation: ranked[0] || null,
    alternative: ranked[1] || null,
    eligibleProviders: ranked,
    explanation: ranked[0]?.recommendationReason || "Highest-ranked verified provider.",
  };
}
