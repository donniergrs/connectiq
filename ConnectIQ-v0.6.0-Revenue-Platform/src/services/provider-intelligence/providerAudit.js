export const PROVIDER_DEPENDENCIES = [
  { path: "src/services/fccService.js", responsibility: "Website/provider lookup client", action: "refactor", risk: "Contains static MOCK_PROVIDERS fallback." },
  { path: "functions/services/staticFccAvailability.js", responsibility: "Static availability lookup", action: "remove-as-availability-source", risk: "Can be mistaken for national address-level availability." },
  { path: "functions/data/fccStaticAvailability.json", responsibility: "Static development dataset", action: "development-only", risk: "Not a nationwide FCC dataset." },
  { path: "src/services/providerIntelligence.js", responsibility: "Carrier metadata/playbooks", action: "keep-metadata-only", risk: "Must never prove address availability." },
  { path: "src/data/carrierIntelligence.js", responsibility: "Carrier sales content", action: "keep-metadata-only", risk: "Static names are acceptable only after availability is verified." },
  { path: "src/services/brain/recommendationEngine.js", responsibility: "Provider ranking", action: "keep-behind-engine", risk: "Must receive verified providers only." },
  { path: "src/services/leadIntakeService.js", responsibility: "CSV enrichment orchestration", action: "migrate", risk: "Must use same engine as website and support resumable jobs." },
  { path: "src/pages/FccLookup.jsx", responsibility: "Admin FCC lookup", action: "migrate", risk: "Currently saves first returned provider directly as recommendation." },
];

export const ARCHITECTURE_DECISIONS = [
  { id: "ADR-001", decision: "Only verified provider sources may establish address availability." },
  { id: "ADR-002", decision: "A lead remains valid when provider verification is empty or fails." },
  { id: "ADR-003", decision: "Static carrier profiles are metadata only." },
  { id: "ADR-004", decision: "Provider Intelligence is the single provider decision boundary." },
  { id: "ADR-005", decision: "Website, CSV, advisor tools, and future APIs use the same provider engine." },
];

export function auditLookupPayload(payload = {}) {
  const providers = Array.isArray(payload.providers) ? payload.providers : [];
  const fallbackProviders = Array.isArray(payload.fallbackProviders) ? payload.fallbackProviders : [];
  const source = String(payload.source || "unknown");
  return {
    source,
    providerCount: providers.length,
    fallbackCount: fallbackProviders.length,
    hasStaticFallback: fallbackProviders.length > 0 || /static|fallback|mock/i.test(source),
    emptyVerifiedResult: providers.length === 0,
    warnings: [
      ...(fallbackProviders.length ? ["Static fallback providers were attached to an empty lookup."] : []),
      ...(/static|fallback|mock/i.test(source) ? [`Lookup source '${source}' is not authoritative.`] : []),
      ...(providers.length === 0 ? ["No providers were returned by the lookup source."] : []),
    ],
  };
}
