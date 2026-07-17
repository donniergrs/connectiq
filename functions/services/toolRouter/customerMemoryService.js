const memoryBySession = new Map();

const FACT_PATTERNS = [
  { key: "monthlyBill", regex: /(?:pay(?:ing)?|bill(?: is)?|costs?)\s*\$?\s*(\d{2,4}(?:\.\d{1,2})?)/i, cast: Number },
  { key: "currentProvider", regex: /(?:with|using|have)\s+(AT&T|ATT|Spectrum|Xfinity|Comcast|Verizon|Frontier|Cox|Windstream|Lumos|T-Mobile|TMobile|Google Fiber)/i },
  { key: "contractStatus", regex: /\b(?:contract|agreement)\s+(?:ends?|expires?)\s+([^,.!?]+)/i },
  { key: "buyingTimeline", regex: /\b(?:moving|need service|switching)\s+(?:in|by|next)?\s*([^,.!?]+)/i },
];

const PAIN_PATTERNS = [
  ["reliability", /\b(drop(?:s|ping)?|disconnect(?:s|ed|ing)?|outage|unreliable|keeps going out)\b/i],
  ["speed", /\b(slow|buffer(?:s|ing)?|lag|latency)\b/i],
  ["wifiCoverage", /\b(wi-?fi|coverage|dead zone|signal)\b/i],
  ["price", /\b(expensive|too much|price|bill|cost)\b/i],
];

const NEED_PATTERNS = [
  ["workFromHome", /\b(work from home|remote work|video calls?|zoom|teams)\b/i],
  ["gaming", /\b(gam(?:e|er|ing)|xbox|playstation)\b/i],
  ["streaming", /\b(stream(?:ing)?|netflix|hulu|youtube tv)\b/i],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function initialProfile(sessionId) {
  return {
    sessionId,
    facts: {},
    painPoints: [],
    householdNeeds: [],
    confidence: {},
    updatedAt: new Date().toISOString(),
  };
}

export function getCustomerMemory(sessionId) {
  if (!memoryBySession.has(sessionId)) memoryBySession.set(sessionId, initialProfile(sessionId));
  return clone(memoryBySession.get(sessionId));
}

export function updateCustomerMemory(sessionId, patch = {}) {
  const current = getCustomerMemory(sessionId);
  const next = {
    ...current,
    ...patch,
    facts: { ...current.facts, ...(patch.facts || {}) },
    confidence: { ...current.confidence, ...(patch.confidence || {}) },
    painPoints: [...new Set([...(current.painPoints || []), ...(patch.painPoints || [])])],
    householdNeeds: [...new Set([...(current.householdNeeds || []), ...(patch.householdNeeds || [])])],
    updatedAt: new Date().toISOString(),
  };
  memoryBySession.set(sessionId, next);
  return clone(next);
}

export function extractFactsFromMessage(message = "") {
  const text = String(message);
  const facts = {};
  const confidence = {};
  for (const pattern of FACT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match?.[1]) {
      facts[pattern.key] = pattern.cast ? pattern.cast(match[1]) : match[1].trim();
      confidence[pattern.key] = 0.88;
    }
  }
  const painPoints = PAIN_PATTERNS.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const householdNeeds = NEED_PATTERNS.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  return { facts, confidence, painPoints, householdNeeds };
}

export function learnFromMessage(sessionId, message) {
  return updateCustomerMemory(sessionId, extractFactsFromMessage(message));
}

export function clearCustomerMemory() {
  memoryBySession.clear();
}
