const memoryBySession = new Map();

const PROVIDERS = "AT&T|ATT|Spectrum|Xfinity|Comcast|Verizon|Frontier|Cox|Windstream|Lumos|T-Mobile|TMobile|Google Fiber|EarthLink|HughesNet|Viasat";
const PRIORITIES = [
  ["price", /^(?:lowest\s+)?price$|\b(price|cheap|cheaper|save|saving|budget|afford|lower bill)\b/i],
  ["reliability", /^reliability$|\b(reliable|uptime|outage|disconnect|goes out)\b/i],
  ["speed", /^(?:fastest\s+)?speed$|\b(fast|faster|slow|bandwidth)\b/i],
  ["wifiCoverage", /^wi-?fi$|\b(coverage|dead zone|upstairs|signal)\b/i],
];

const FACT_PATTERNS = [
  { key: "monthlyBill", regex: /(?:pay(?:ing)?|bill(?:\s+is)?|costs?)\s*(?:about\s*)?\$?\s*(\d{2,4}(?:\.\d{1,2})?)/i, cast: Number },
  { key: "monthlyBill", regex: /(?:\$\s*)?(\d{2,4}(?:\.\d{1,2})?)\s*(?:a|per)?\s*(?:month|monthly|\/mo)\b/i, cast: Number },
  { key: "currentProvider", regex: new RegExp(`(?:with|using|have|provider(?:\\s+is)?|internet(?:\\s+is)?(?:\\s+through)?)\\s+(${PROVIDERS})\\b`, "i"), normalize: normalizeProvider },
  { key: "currentProvider", regex: new RegExp(`^\\s*(${PROVIDERS})\\s*[.!?]*\\s*$`, "i"), normalize: normalizeProvider },
  { key: "serviceAddress", regex: /\b(\d{1,6}\s+[a-z0-9.' -]+\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|court|ct|circle|cir|highway|hwy)(?:[ ,]+[a-z.' -]+)?(?:[ ,]+[a-z]{2})?(?:[ ,]+\d{5}(?:-\d{4})?)?)/i },
  { key: "contractStatus", regex: /\b(?:contract|agreement)\s+(?:ends?|expires?)\s+([^,.!?]+)/i },
  { key: "buyingTimeline", regex: /\b(?:moving|need service|switching)\s+(?:in|by|next)?\s*([^,.!?]+)/i },
];

const PAIN_PATTERNS = [
  ["reliability", /\b(drop(?:s|ping)?|disconnect(?:s|ed|ing)?|outage|unreliable|keeps going out|sucks?|terrible|awful)\b/i],
  ["speed", /\b(slow|buffer(?:s|ing)?|lag|latency)\b/i],
  ["wifiCoverage", /\b(wi-?fi|coverage|dead zone|signal|upstairs)\b/i],
  ["price", /\b(expensive|too much|price|bill|cost|cheaper|lower price|save money)\b/i],
];

const NEED_PATTERNS = [
  ["workFromHome", /\b(work from home|remote work|video calls?|zoom|teams)\b/i],
  ["gaming", /\b(gam(?:e|er|ing)|xbox|playstation)\b/i],
  ["streaming", /\b(stream(?:ing)?|netflix|hulu|youtube tv)\b/i],
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeProvider(value) {
  const compact = value.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const aliases = { att: "AT&T", tmobile: "T-Mobile", comcast: "Xfinity" };
  return aliases[compact] || value.trim().replace(/\b\w/g, c => c.toUpperCase());
}
function initialProfile(sessionId) {
  return {
    sessionId,
    facts: {},
    painPoints: [],
    householdNeeds: [],
    preferences: [],
    corrections: [],
    threads: [],
    decisions: [],
    confidence: {},
    primaryGoal: "find_best_internet_service",
    handoffRequested: false,
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
    preferences: [...new Set([...(current.preferences || []), ...(patch.preferences || [])])],
    corrections: [...(current.corrections || []), ...(patch.corrections || [])].slice(-25),
    threads: patch.threads || current.threads || [],
    decisions: [...(current.decisions || []), ...(patch.decisions || [])].slice(-50),
    updatedAt: new Date().toISOString(),
  };
  memoryBySession.set(sessionId, next);
  return clone(next);
}
export function extractFactsFromMessage(message = "", currentMemory = {}) {
  const text = String(message).trim();
  const facts = {};
  const confidence = {};
  const corrections = [];
  for (const pattern of FACT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match?.[1] && facts[pattern.key] === undefined) {
      const raw = pattern.cast ? pattern.cast(match[1]) : match[1].trim();
      facts[pattern.key] = pattern.normalize ? pattern.normalize(raw) : raw;
      confidence[pattern.key] = 0.92;
    }
  }
  // Contextual numeric answer after the system has already learned provider but not bill.
  if (!facts.monthlyBill && currentMemory.facts?.currentProvider && !currentMemory.facts?.monthlyBill && /^\s*\$?\d{2,4}(?:\.\d{1,2})?\s*$/.test(text)) {
    facts.monthlyBill = Number(text.replace("$", "").trim());
    confidence.monthlyBill = 0.82;
  }
  const correctionMatch = text.match(/\b(?:actually|correction|i meant|not)\b[,: ]*(?:i (?:have|use|pay) )?(.+)/i);
  if (correctionMatch) corrections.push({ text, detectedAt: new Date().toISOString() });
  const painPoints = PAIN_PATTERNS.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const householdNeeds = NEED_PATTERNS.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const preferences = PRIORITIES.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const handoffRequested = /\b(human|person|representative|agent|call me)\b/i.test(text);
  return { facts, confidence, painPoints, householdNeeds, preferences, corrections, handoffRequested };
}
export function learnFromMessage(sessionId, message) {
  const current = getCustomerMemory(sessionId);
  return updateCustomerMemory(sessionId, extractFactsFromMessage(message, current));
}
export function clearCustomerMemory() { memoryBySession.clear(); }
