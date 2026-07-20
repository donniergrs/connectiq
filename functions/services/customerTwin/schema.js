export const CUSTOMER_TWIN_SCHEMA_VERSION = "1.0.0";

export const FACT_SOURCES = Object.freeze({
  EXPLICIT: "explicit",
  VERIFIED: "verified",
  INFERRED: "inferred",
  SYSTEM: "system",
});

export const CUSTOMER_TWIN_DOMAINS = Object.freeze([
  "identity",
  "location",
  "currentService",
  "household",
  "usage",
  "budget",
  "painPoints",
  "goals",
  "preferences",
  "buyingSignals",
  "objections",
]);

export function createEmptyTwin({ customerId, sessionId = null, channel = "web", now = new Date().toISOString() }) {
  return {
    id: customerId,
    schemaVersion: CUSTOMER_TWIN_SCHEMA_VERSION,
    version: 1,
    status: "active",
    channels: [channel],
    sessionIds: sessionId ? [sessionId] : [],
    understanding: Object.fromEntries(CUSTOMER_TWIN_DOMAINS.map((domain) => [domain, {}])),
    recommendation: {
      currentLeader: null,
      confidence: 0,
      readiness: "NOT_READY",
      reasons: [],
      updatedAt: null,
    },
    nextBestAction: {
      type: "CONTINUE_DISCOVERY",
      objective: "Learn the customer’s needs",
      question: null,
      reason: "The customer twin has just been created.",
      confidence: 0.5,
    },
    metrics: {
      understandingScore: 0,
      explicitFactCount: 0,
      inferredFactCount: 0,
      unknownCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeFact(input = {}, now = new Date().toISOString()) {
  const confidence = Number.isFinite(Number(input.confidence))
    ? Math.max(0, Math.min(1, Number(input.confidence)))
    : input.source === FACT_SOURCES.EXPLICIT || input.source === FACT_SOURCES.VERIFIED
      ? 0.99
      : 0.7;

  return {
    key: String(input.key || "").trim(),
    value: input.value,
    confidence,
    source: input.source || FACT_SOURCES.INFERRED,
    evidence: Array.isArray(input.evidence)
      ? input.evidence.filter(Boolean).map(String)
      : input.evidence
        ? [String(input.evidence)]
        : [],
    sourceMessageId: input.sourceMessageId || null,
    updatedAt: now,
  };
}
