import { lookupProviders } from "../fccService.js";
import { normalizeProviderList } from "./providerNormalizer.js";
import { buildVerifiedRecommendation } from "./providerRecommendation.js";

export async function lookupProviderIntelligence(address, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 15000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const raw = await lookupProviders(address, { signal: controller.signal });
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
      status: providers.length ? "verified" : "no_verified_providers",
      lookedUpAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      address,
      source: "lookup-error",
      raw: null,
      providers: [],
      recommendation: buildVerifiedRecommendation([]),
      status: error?.name === "AbortError" ? "timeout" : "failed",
      error: error?.message || String(error),
      lookedUpAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
