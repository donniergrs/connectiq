export function buildImportExecutionPlan(total = 0, options = {}) {
  return {
    total,
    chunkSize: Number(options.chunkSize || 200),
    enrichmentConcurrency: Number(options.enrichmentConcurrency || 3),
    deferEnrichment: options.deferEnrichment !== false,
    mode: "create-first-background-enrichment",
  };
}
