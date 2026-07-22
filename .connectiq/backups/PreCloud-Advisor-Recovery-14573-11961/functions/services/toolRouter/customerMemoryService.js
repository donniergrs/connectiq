const memoryBySession = new Map();

const PROVIDERS = "AT&T|ATT|Spectrum|Spetrum|Spectum|Xfinity|Comcast|Verizon|Frontier|Cox|Windstream|Lumos|T-Mobile|TMobile|Google Fiber|EarthLink|HughesNet|Viasat|WOW!?|Open Broadband|Skyrunner|XNET";
const PRIORITIES = [
  ["price", /^(?:lowest\s+)?price$|\b(price|cheap|cheaper|save|saving|budget|afford|lower bill|too expensive)\b/i],
  ["reliability", /^reliability$|\b(reliable|reliability|uptime|outage|disconnect|goes out|drops?)\b/i],
  ["speed", /^(?:fastest\s+)?speed$|\b(fast|faster|slow|bandwidth|buffering|latency)\b/i],
  ["wifiCoverage", /^wi-?fi$|\b(wi-?fi|coverage|dead zone|upstairs|signal)\b/i],
];
const NEED_PATTERNS = [
  ["workFromHome", /\b(work from home|remote work|video calls?|zoom|teams|vpn)\b/i],
  ["gaming", /\b(gam(?:e|er|ing)|xbox|playstation)\b/i],
  ["streaming", /\b(stream(?:ing)?|netflix|hulu|youtube tv)\b/i],
  ["school", /\b(school|homework|online class)\b/i],
];
const PAIN_PATTERNS = [
  ["reliability", /\b(drop(?:s|ping)?|disconnect(?:s|ed|ing)?|outage|unreliable|keeps going out|reliability)\b/i],
  ["speed", /\b(slow|buffer(?:s|ing)?|lag|latency)\b/i],
  ["wifiCoverage", /\b(wi-?fi|coverage|dead zone|signal|upstairs)\b/i],
  ["price", /\b(expensive|too much|price|bill|cost|cheaper|lower price|save money)\b/i],
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeProvider(value) {
  const compact = String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
  const aliases = { att: "AT&T", tmobile: "T-Mobile", comcast: "Xfinity", spetrum: "Spectrum", spectum: "Spectrum", wow: "WOW!" };
  return aliases[compact] || String(value).trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
function initialProfile(sessionId) {
  return { sessionId, facts: {}, painPoints: [], householdNeeds: [], preferences: [], corrections: [], threads: [], decisions: [], confidence: {}, primaryGoal: "find_best_internet_service", handoffRequested: false, rejectedProviders: [], selectedProvider: null, recentTurns: [], updatedAt: new Date().toISOString() };
}
export function getCustomerMemory(sessionId) { if (!memoryBySession.has(sessionId)) memoryBySession.set(sessionId, initialProfile(sessionId)); return clone(memoryBySession.get(sessionId)); }
export function updateCustomerMemory(sessionId, patch = {}) {
  const current = getCustomerMemory(sessionId);
  const next = { ...current, ...patch, facts: { ...current.facts, ...(patch.facts || {}) }, confidence: { ...current.confidence, ...(patch.confidence || {}) }, painPoints: [...new Set([...(current.painPoints || []), ...(patch.painPoints || [])])], householdNeeds: [...new Set([...(current.householdNeeds || []), ...(patch.householdNeeds || [])])], preferences: [...new Set([...(current.preferences || []), ...(patch.preferences || [])])], corrections: [...(current.corrections || []), ...(patch.corrections || [])].slice(-25), rejectedProviders: [...new Set([...(current.rejectedProviders || []), ...(patch.rejectedProviders || [])])], selectedProvider: patch.selectedProvider ?? current.selectedProvider ?? null, threads: patch.threads || current.threads || [], decisions: [...(current.decisions || []), ...(patch.decisions || [])].slice(-50), recentTurns: [...(current.recentTurns || []), ...(patch.recentTurns || [])].slice(-20), updatedAt: new Date().toISOString() };
  memoryBySession.set(sessionId, next); return clone(next);
}
export function hydrateCustomerMemory(sessionId, snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") return getCustomerMemory(sessionId);
  return updateCustomerMemory(sessionId, { ...snapshot, recentTurns: Array.isArray(snapshot.recentTurns) ? snapshot.recentTurns.slice(-20) : [] });
}

function lastAdvisorAction(memory = {}) { return memory.lastNextAction || memory.decisions?.slice(-1)[0]?.action || ""; }
function contextualFacts(text, memory) {
  const action = lastAdvisorAction(memory);
  const lower = text.toLowerCase();
  const facts = {};
  if (action === "ask_issue_type") {
    if (/whole|entire|everything|internet goes out|complete outage/.test(lower)) facts.issueType = "full_connection";
    else if (/wi-?fi|wireless|signal|coverage/.test(lower)) facts.issueType = "wifi_only";
    else if (/buffer|slow|lag/.test(lower)) facts.issueType = "performance";
    facts.problemDescription = text;
  }
  if (action === "ask_issue_frequency") facts.issueFrequency = text;
  if (action === "ask_customer_impact") { facts.usageImpact = text; if (/work|zoom|teams|vpn|job/.test(lower)) facts.businessImpact = true; }
  if (action === "ask_decision_priority") facts.decisionPriority = /reliab/.test(lower) ? "reliability" : /cheap|lower|price|cost/.test(lower) ? "price" : "balanced";
  if (action === "ask_troubleshooting") { facts.contactedProvider = /yes|already|did|couldn.?t|could not/.test(lower); facts.troubleshootingStatus = text; }
  if (action === "ask_switch_intent") { facts.switchIntent = text; facts.buyingTimeline = text; }
  if (action === "ask_contact_preference" && /text|sms|email|phone|call/.test(lower)) facts.contactPreference = /text|sms/.test(lower) ? "text" : /email/.test(lower) ? "email" : "phone";
  return facts;
}

export function extractFactsFromMessage(message = "", currentMemory = {}) {
  const text = String(message).trim(); const facts = contextualFacts(text, currentMemory); const confidence = {}; const corrections = [];
  const bill = text.match(/(?:pay(?:ing)?|bill(?:\s+is)?|costs?|\$)\s*(?:about\s*)?\$?\s*(\d{2,4}(?:\.\d{1,2})?)/i) || text.match(/^(?:\$\s*)?(\d{2,4}(?:\.\d{1,2})?)\s*(?:a|per)?\s*(?:month|monthly|\/mo)?$/i);
  if (bill) facts.monthlyBill = Number(bill[1]);
  const provider = text.match(new RegExp(`(?:with|using|have|currently have|provider(?:\\s+is)?|internet(?:\\s+is)?(?:\\s+through)?)\\s+(${PROVIDERS})\\b`, "i")) || text.match(new RegExp(`^\\s*(${PROVIDERS})\\s*[.!?]*\\s*$`, "i"));
  if (provider) facts.currentProvider = normalizeProvider(provider[1]);
  const email = text.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i); if (email) facts.email = email[1].toLowerCase();
  const phone = text.match(/\b(?:\+?1[ .-]?)?\(?([2-9]\d{2})\)?[ .-]?(\d{3})[ .-]?(\d{4})\b/); if (phone) facts.phone = `${phone[1]}-${phone[2]}-${phone[3]}`;
  const name = text.match(/^\s*(?:my name is|this is)\s+([a-z][a-z' -]{1,40})[.!?]*\s*$/i); if (name) { facts.customerName = name[1].trim().replace(/\b\w/g, c => c.toUpperCase()); facts.preferredName = facts.customerName.split(/\s+/)[0]; }
  const contact = text.match(/\b(text|sms|email|phone call|call me|phone)\b/i); if (contact && lastAdvisorAction(currentMemory) === "ask_contact_preference") facts.contactPreference = /text|sms/i.test(contact[1]) ? "text" : /email/i.test(contact[1]) ? "email" : "phone";
  const painPoints = PAIN_PATTERNS.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const householdNeeds = NEED_PATTERNS.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const preferences = PRIORITIES.filter(([, regex]) => regex.test(text)).map(([key]) => key);
  const rejectionMatches = [...text.matchAll(new RegExp(`(?:don'?t want|do not want|exclude|remove|not interested in|anything but)\\s+(?:the\\s+|that\\s+)?(${PROVIDERS})\\b`, "ig"))];
  const rejectedProviders = rejectionMatches.map((match) => normalizeProvider(match[1]));
  return { facts, confidence, painPoints, householdNeeds, preferences, corrections, handoffRequested: /\b(human|person|representative|agent|call me)\b/i.test(text), rejectedProviders };
}
export function learnFromMessage(sessionId, message) { return updateCustomerMemory(sessionId, extractFactsFromMessage(message, getCustomerMemory(sessionId))); }
export function clearCustomerMemory() { memoryBySession.clear(); }
