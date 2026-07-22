const memoryBySession = new Map();

const PROVIDERS = "AT&T|ATT|Spectrum|Spetrum|Spectum|Spetrum|Spectum|Xfinity|Comcast|Verizon|Frontier|Cox|Windstream|Lumos|T-Mobile|TMobile|Google Fiber|EarthLink|HughesNet|Viasat";
const PRIORITIES = [
  ["price", /^(?:lowest\s+)?price$|\b(price|cheap|cheaper|save|saving|budget|afford|lower bill)\b/i],
  ["reliability", /^reliability$|\b(reliable|uptime|outage|disconnect|goes out)\b/i],
  ["speed", /^(?:fastest\s+)?speed$|\b(fast|faster|slow|bandwidth)\b/i],
  ["wifiCoverage", /^wi-?fi$|\b(coverage|dead zone|upstairs|signal)\b/i],
];

const CONTACT_PATTERNS = [
  { key: "email", regex: /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i, normalize: (value) => value.toLowerCase() },
  { key: "phone", regex: /(?:\+?1[ .-]?)?(?:\(?([2-9]\d{2})\)?[ .-]?)?([2-9]\d{2})[ .-]?(\d{4})\b/, normalizeMatch: (match) => match[1] ? `${match[1]}-${match[2]}-${match[3]}` : `${match[2]}-${match[3]}` },
  { key: "contactPreference", regex: /\b(?:prefer|by|send it by|reach me by)?\s*(text|sms|email|phone call|call)\b/i, normalize: (value) => ({ sms: "text", call: "phone", "phone call": "phone" }[value.toLowerCase()] || value.toLowerCase()) },
  { key: "bestContactTime", regex: /\b(morning|afternoon|evening)\b/i, normalize: (value) => value.toLowerCase() },
];

const FACT_PATTERNS = [
  { key: "email", regex: /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i },
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
  const aliases = { att: "AT&T", tmobile: "T-Mobile", comcast: "Xfinity", spetrum: "Spectrum", spectum: "Spectrum" };
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
    rejectedProviders: [],
    selectedProvider: null,
    recentTurns: [],
    updatedAt: new Date().toISOString(),
  };
}
export function hydrateCustomerMemory(sessionId, clientMemory = {}) {
  if (!sessionId || !clientMemory || typeof clientMemory !== "object") return getCustomerMemory(sessionId);
  const current = getCustomerMemory(sessionId);
  const hydrated = {
    ...current,
    ...clientMemory,
    sessionId,
    facts: { ...current.facts, ...(clientMemory.facts || {}) },
    confidence: { ...current.confidence, ...(clientMemory.confidence || {}) },
    painPoints: [...new Set([...(current.painPoints || []), ...(clientMemory.painPoints || [])])],
    householdNeeds: [...new Set([...(current.householdNeeds || []), ...(clientMemory.householdNeeds || [])])],
    preferences: [...new Set([...(current.preferences || []), ...(clientMemory.preferences || [])])],
    rejectedProviders: [...new Set([...(current.rejectedProviders || []), ...(clientMemory.rejectedProviders || [])])],
    updatedAt: new Date().toISOString(),
  };
  memoryBySession.set(sessionId, hydrated);
  return clone(hydrated);
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
    rejectedProviders: [...new Set([...(current.rejectedProviders || []), ...(patch.rejectedProviders || [])])],
    selectedProvider: patch.selectedProvider ?? current.selectedProvider ?? null,
    threads: patch.threads || current.threads || [],
    decisions: [...(current.decisions || []), ...(patch.decisions || [])].slice(-50),
    recentTurns: [...(current.recentTurns || []), ...(patch.recentTurns || [])].slice(-16),
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
  for (const pattern of CONTACT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match && facts[pattern.key] === undefined) {
      const raw = pattern.normalizeMatch ? pattern.normalizeMatch(match) : String(match[1] || "").trim();
      facts[pattern.key] = pattern.normalize ? pattern.normalize(raw) : raw;
      confidence[pattern.key] = 0.95;
    }
  }
  const advisorAskedContactPreference = /\b(?:prefer|text, email|email, or|phone call|how.*contact)\b/i.test(currentMemory.recentTurns?.filter((turn) => turn.role === "advisor").slice(-1)[0]?.message || "") || currentMemory.lastNextAction === "ask_contact_preference";
  if (advisorAskedContactPreference && /any(?:one| of those)?|either|all (?:of )?(?:them|those)|doesn'?t matter|no preference/i.test(text)) {
    facts.contactPreference = "any";
    confidence.contactPreference = 0.96;
  }
  const explicitName = text.match(/(?:^|[.!?]\s*)(?:my name is|this is|i am|i'm)\s+([a-z][a-z' -]{0,40}?)(?=[.!?,]|\s+(?:and|but|i\b|im\b|i'm\b)|$)/i);
  const advisorAskedName = /\b(who do i have|who am i speaking|your name)\b/i.test(currentMemory.recentTurns?.filter((turn) => turn.role === "advisor").slice(-1)[0]?.message || "");
  if (!currentMemory.facts?.customerName && (explicitName?.[1] || (advisorAskedName && /^[a-z][a-z '-]{1,50}[.!?]*$/i.test(text)))) {
    const value = String(explicitName?.[1] || text).replace(/[.!?]+$/, "").trim().replace(/\b\w/g, (character) => character.toUpperCase());
    facts.customerName = value;
    facts.preferredName = value.split(/\s+/)[0];
    confidence.customerName = 0.94;
  }
  const phoneMatch = text.match(/\b(?:\+?1[ .-]?)?\(?([2-9]\d{2})\)?[ .-]?(\d{3})[ .-]?(\d{4})\b/);
  if (phoneMatch) {
    facts.phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
    confidence.phone = 0.98;
  }
  const nameMatch = text.match(/\b(?:my name is|i am|i'm)\s+([a-z][a-z' -]{1,50})/i);
  if (nameMatch && !/\b(?:with|paying|looking|trying|working|gaming|streaming)\b/i.test(nameMatch[1])) {
    facts.customerName = nameMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    confidence.customerName = 0.88;
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
  const rejectionMatch = text.match(new RegExp(`(?:don'?t want|do not want|exclude|remove|not interested in|anything but)\\s+(?:\\b(?:the|that)\\b\\s+)?(${PROVIDERS})\\b`, "i"));
  const rejectedProviders = rejectionMatch?.[1] ? [normalizeProvider(rejectionMatch[1])] : [];
  return { facts, confidence, painPoints, householdNeeds, preferences, corrections, handoffRequested, rejectedProviders };
}
export function learnFromMessage(sessionId, message) {
  const current = getCustomerMemory(sessionId);
  return updateCustomerMemory(sessionId, extractFactsFromMessage(message, current));
}
export function clearCustomerMemory() { memoryBySession.clear(); }
