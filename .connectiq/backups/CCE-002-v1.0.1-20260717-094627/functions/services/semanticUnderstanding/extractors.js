import { CONFIDENCE, FACT_SOURCE } from "./constants.js";
import { PROVIDER_PATTERN, PAIN_PATTERNS, USAGE_PATTERNS } from "./lexicon.js";
import { canonicalProvider, parseMoney, parseSpeed, unique } from "./normalization.js";

function fact(domain, key, value, evidence, confidence = CONFIDENCE.EXPLICIT, source = FACT_SOURCE.EXPLICIT) {
  return { domain, key, value, evidence, confidence, source };
}

export function extractProvider(text) {
  const directPatterns = [
    /\b(?:I\s+)?(?:have|use|currently have|currently use|am with|I'm with|my provider is)\s+(?:internet\s+from\s+)?([A-Za-z0-9&+\- ]{2,40})/i,
    /\b(?:with|using)\s+(AT\s*&\s*T|ATT|Spectrum|Charter|Xfinity|Comcast|Verizon|Fios|T-?Mobile|Frontier|Cox|CenturyLink|Quantum(?: Fiber)?|Google Fiber|GFiber|Lumos|Windstream|Kinetic|HughesNet|Viasat|Starlink)\b/i,
  ];
  for (const pattern of directPatterns) {
    const match = text.match(pattern);
    if (match) {
      const providerMatch = match[1].match(PROVIDER_PATTERN);
      const provider = canonicalProvider(providerMatch?.[0] || match[1].replace(/[,.!?].*$/, "").trim());
      if (provider) return fact("currentService", "currentProvider", provider, match[0]);
    }
  }
  return null;
}

export function extractMoney(text) {
  const matches = [
    text.match(/\b(?:pay|paying|bill(?: is)?|costs?|spend)\s+(?:about|around|roughly|approximately)?\s*\$?\s*([0-9]{2,4}(?:\.[0-9]{1,2})?)/i),
    text.match(/\$\s*([0-9]{2,4}(?:\.[0-9]{1,2})?)\s*(?:a|per)?\s*month/i),
  ].filter(Boolean);
  if (!matches.length) return null;
  const value = parseMoney(matches[0][1]);
  return value == null ? null : fact("budget", "monthlyBill", value, matches[0][0]);
}

export function extractTargetBudget(text) {
  const match = text.match(/\b(?:under|below|less than|budget is|want to pay|target(?: is)?)\s*\$?\s*([0-9]{2,4})\b/i);
  if (!match) return null;
  const value = parseMoney(match[1]);
  return value == null ? null : fact("budget", "targetMonthlyBudget", value, match[0]);
}

export function extractSpeed(text) {
  const match = text.match(/\b(?:have|get|speed(?: is)?|plan(?: is)?|pay for)\s*(?:up to\s*)?([0-9]+(?:\.[0-9]+)?)\s*(gig(?:abit)?s?|gbps|mbps|meg(?:abit)?s?)\b/i);
  if (!match) return null;
  const value = parseSpeed(match[1], match[2]);
  return value == null ? null : fact("currentService", "currentSpeedMbps", value, match[0]);
}

export function extractDesiredSpeed(text) {
  const match = text.match(/\b(?:want|need|looking for|prefer)\s*(?:at least\s*)?([0-9]+(?:\.[0-9]+)?)\s*(gig(?:abit)?s?|gbps|mbps|meg(?:abit)?s?)\b/i);
  if (!match) return null;
  const value = parseSpeed(match[1], match[2]);
  return value == null ? null : fact("goals", "desiredSpeedMbps", value, match[0]);
}

export function extractHousehold(text) {
  const facts = [];
  const household = text.match(/\b(?:family|household|home)\s+of\s+([1-9][0-9]?)\b/i)
    || text.match(/\b([1-9][0-9]?)\s+(?:people|persons?)\s+(?:in|at)\s+(?:the|our|my)\s+(?:house|home|household)\b/i);
  if (household) facts.push(fact("household", "householdSize", Number(household[1]), household[0]));

  const remote = text.match(/\b([1-9][0-9]?)\s+(?:people\s+)?(?:work|working)\s+from\s+home\b/i);
  if (remote) facts.push(fact("household", "remoteWorkers", Number(remote[1]), remote[0]));

  const devices = text.match(/\b([1-9][0-9]?)\s+(?:connected\s+)?devices?\b/i);
  if (devices) facts.push(fact("usage", "deviceCount", Number(devices[1]), devices[0]));

  return facts;
}

export function extractUsage(text) {
  return USAGE_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ key, value, pattern }) => {
      const match = text.match(pattern);
      return fact("usage", key, value, match?.[0] || text, CONFIDENCE.STRONG_INFERENCE, FACT_SOURCE.INFERRED);
    });
}

export function extractPainPoints(text) {
  return PAIN_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ key, pattern }) => {
      const match = text.match(pattern);
      return fact("painPoints", key, true, match?.[0] || text, CONFIDENCE.STRONG_INFERENCE, FACT_SOURCE.INFERRED);
    });
}

export function extractTimeline(text) {
  const patterns = [
    [/\b(today|right now|immediately|as soon as possible|asap)\b/i, "immediate"],
    [/\b(this week|within a week)\b/i, "within_week"],
    [/\b(this month|within a month)\b/i, "within_month"],
    [/\b(next month)\b/i, "next_month"],
    [/\b(just researching|only researching|not ready yet|later)\b/i, "researching"],
  ];
  for (const [pattern, value] of patterns) {
    const match = text.match(pattern);
    if (match) return fact("goals", "switchTimeline", value, match[0], CONFIDENCE.STRONG_INFERENCE, FACT_SOURCE.INFERRED);
  }
  return null;
}

export function extractBuyingSignals(text) {
  const facts = [];
  const ready = text.match(/\b(ready to switch|want to switch|need to switch|sign me up|ready to order)\b/i);
  if (ready) facts.push(fact("buyingSignals", "readyToSwitch", true, ready[0], CONFIDENCE.STRONG_INFERENCE, FACT_SOURCE.INFERRED));
  const quote = text.match(/\b(quote|pricing|price options?|how much would it cost)\b/i);
  if (quote) facts.push(fact("buyingSignals", "requestedQuote", true, quote[0], CONFIDENCE.STRONG_INFERENCE, FACT_SOURCE.INFERRED));
  const order = text.match(/\b(place the order|order it|sign me up)\b/i);
  if (order) facts.push(fact("buyingSignals", "requestedOrder", true, order[0], CONFIDENCE.STRONG_INFERENCE, FACT_SOURCE.INFERRED));
  return facts;
}

export function extractFacts(text) {
  return unique([
    extractProvider(text),
    extractMoney(text),
    extractTargetBudget(text),
    extractSpeed(text),
    extractDesiredSpeed(text),
    extractTimeline(text),
    ...extractHousehold(text),
    ...extractUsage(text),
    ...extractPainPoints(text),
    ...extractBuyingSignals(text),
  ].filter(Boolean).map((item) => JSON.stringify(item))).map((item) => JSON.parse(item));
}
