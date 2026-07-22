import { lookupProviders } from "../openAiProviderService.js";
import { normalizeProviderList } from "./providerNormalizer.js";
import { buildVerifiedRecommendation } from "./providerRecommendation.js";

export async function lookupProviderIntelligence(address, options = {}) {
  try {
    const raw = await lookupProviders(address);
    const source = raw?.source || "fcc";
    const providers = normalizeProviderList(raw?.providers || [], source)
      .map((provider) => ({ ...provider, verified: provider.verified || /^fcc|dsi|carrier-api/i.test(source) }));
    const recommendation = buildVerifiedRecommendation(providers, options);
    return {
      address,
      source,
      raw,
      providers,
      recommendation,
      aiCandidates: Array.isArray(raw?.aiCandidates) ? raw.aiCandidates : [],
      status: providers.length ? "verified" : (raw?.status || "no_verified_providers"),
      lookedUpAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      address,
      source: "lookup-error",
      raw: null,
      providers: [],
      aiCandidates: [],
      recommendation: buildVerifiedRecommendation([]),
      status: error?.name === "AbortError" ? "timeout" : "failed",
      error: error?.message || String(error),
      lookedUpAt: new Date().toISOString(),
    };
  }
}
