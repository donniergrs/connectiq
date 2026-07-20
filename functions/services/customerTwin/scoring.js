const REQUIRED_RECOMMENDATION_FACTS = [
  ["currentService", "currentProvider"],
  ["budget", "monthlyBill"],
  ["goals", "primaryPriority"],
  ["usage", "internetUsage"],
];

export function calculateUnderstandingMetrics(twin) {
  const facts = Object.values(twin.understanding || {})
    .flatMap((domain) => Object.values(domain || {}))
    .filter((fact) => fact && fact.value !== undefined && fact.value !== null && fact.value !== "");

  const explicitFactCount = facts.filter((fact) => ["explicit", "verified"].includes(fact.source)).length;
  const inferredFactCount = facts.filter((fact) => fact.source === "inferred").length;
  const confidenceTotal = facts.reduce((sum, fact) => sum + Number(fact.confidence || 0), 0);
  const understandingScore = facts.length
    ? Math.round((confidenceTotal / facts.length) * Math.min(100, 25 + facts.length * 12))
    : 0;

  const unknownCount = REQUIRED_RECOMMENDATION_FACTS.filter(
    ([domain, key]) => !twin.understanding?.[domain]?.[key]?.value
  ).length;

  return {
    understandingScore: Math.max(0, Math.min(100, understandingScore)),
    explicitFactCount,
    inferredFactCount,
    unknownCount,
  };
}

export function determineRecommendationReadiness(twin) {
  const missing = REQUIRED_RECOMMENDATION_FACTS
    .filter(([domain, key]) => !twin.understanding?.[domain]?.[key]?.value)
    .map(([domain, key]) => `${domain}.${key}`);

  const score = twin.metrics?.understandingScore || 0;
  return {
    ready: missing.length === 0 && score >= 70,
    status: missing.length === 0 && score >= 70 ? "READY" : "NOT_READY",
    missing,
  };
}
