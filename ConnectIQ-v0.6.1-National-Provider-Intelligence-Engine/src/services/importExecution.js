export function buildImportExecutionPlan(total = 0, options = {}) {
  const immediateEnrichmentLimit = Number(options.immediateEnrichmentLimit || 500);
  return {
    total,
    chunkSize: Number(options.chunkSize || 100),
    deferEnrichment: total > immediateEnrichmentLimit,
    immediateEnrichmentLimit,
  };
}
