import { normalizeProviderList } from "./providerNormalizer.js";
import { buildVerifiedRecommendation } from "./providerRecommendation.js";
import { auditLookupPayload } from "./providerAudit.js";
import { addTraceEvent, completeProviderTrace, createProviderTrace } from "./providerTrace.js";

export async function runProviderDiagnostic({ address, lookup, currentCarrier = "", needs = {}, origin = "admin" }) {
  let trace = createProviderTrace(address, origin);
  try {
    trace = addTraceEvent(trace, "lookup_started", "Provider source request started");
    const raw = await lookup(address);
    trace = addTraceEvent(trace, "lookup_completed", `${raw?.providers?.length || 0} raw providers returned`);
    const source = raw?.source || "unknown";
    const normalizedProviders = normalizeProviderList(raw?.providers || [], source);
    trace = addTraceEvent(trace, "providers_normalized", `${normalizedProviders.length} normalized providers`);
    const recommendation = buildVerifiedRecommendation(normalizedProviders, { currentCarrier, needs });
    trace = addTraceEvent(trace, "recommendation_evaluated", recommendation.status);
    trace = completeProviderTrace(trace);
    return {
      trace,
      raw,
      audit: auditLookupPayload(raw),
      normalizedProviders,
      recommendation,
    };
  } catch (error) {
    trace = addTraceEvent(trace, "lookup_failed", error.message || String(error));
    trace = completeProviderTrace(trace, "failed", error);
    return {
      trace,
      raw: null,
      audit: { source: "unknown", providerCount: 0, fallbackCount: 0, hasStaticFallback: false, emptyVerifiedResult: true, warnings: [error.message || String(error)] },
      normalizedProviders: [],
      recommendation: buildVerifiedRecommendation([]),
      error: error.message || String(error),
    };
  }
}
