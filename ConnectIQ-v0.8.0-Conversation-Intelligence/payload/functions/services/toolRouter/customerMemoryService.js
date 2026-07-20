const memoryBySession = new Map();
const PROVIDERS = "AT&T|ATT|Spectrum|Xfinity|Comcast|Verizon|Frontier|Cox|Windstream|Lumos|T-Mobile|TMobile|Google Fiber|Brightspeed|Optimum|CenturyLink|Altafiber|Metronet|EarthLink";
const FACT_PATTERNS = [
  { key: "monthlyBill", regex: /(?:pay(?:ing)?|bill(?: is)?|costs?|around|about)?\s*\$?\s*(\d{2,4}(?:\.\d{1,2})?)\s*(?:a\s*month|per\s*month|monthly|\/\s*mo\b)/i, cast: Number },
  { key: "monthlyBill", regex: /(?:pay(?:ing)?|bill(?: is)?|costs?)\s*\$?\s*(\d{2,4}(?:\.\d{1,2})?)/i, cast: Number },
  { key: "currentProvider", regex: new RegExp(`(?:with|using|have|provider is|currently on)\\s+(${PROVIDERS})`, "i") },
  { key: "currentProvider", regex: new RegExp(`^\\s*(${PROVIDERS})\\s*[.!]?$`, "i") },
  { key: "contractStatus", regex: /\b(?:contract|agreement)\s+(?:ends?|expires?)\s+([^,.!?]+)/i },
  { key: "buyingTimeline", regex: /\b(?:moving|need service|switching|installed?)\s+(?:in|by|next|before)?\s*([^,.!?]+)/i },
  { key: "email", regex: /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i },
  { key: "phone", regex: /\b((?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/ },
];
const PAIN_PATTERNS = [
  ["reliability", /\b(drop(?:s|ping)?|disconnect(?:s|ed|ing)?|outage|unreliable|keeps going out|sucks|terrible|awful)\b/i],
  ["speed", /\b(slow|buffer(?:s|ing)?|lag|latency|faster|speed)\b/i],
  ["wifiCoverage", /\b(wi-?fi|coverage|dead zone|signal|upstairs|downstairs)\b/i],
  ["price", /\b(expensive|too much|price|bill|cost|cheaper|save money|lowest price|budget)\b/i],
  ["support", /\b(customer service|support|hold time|rude|help)\b/i],
];
const NEED_PATTERNS = [
  ["workFromHome", /\b(work from home|remote work|video calls?|zoom|teams)\b/i],
  ["gaming", /\b(gam(?:e|er|ing)|xbox|playstation)\b/i],
  ["streaming", /\b(stream(?:ing)?|netflix|hulu|youtube tv)\b/i],
  ["smartHome", /\b(smart home|camera|doorbell|alexa|google home)\b/i],
  ["largeHousehold", /\b(?:[5-9]|\d{2,})\s+(?:people|users|devices)\b/i],
];
const PRIORITIES = [["price",/^(?:price|cost|cheapest|lowest price)$/i],["reliability",/^(?:reliability|reliable|uptime)$/i],["speed",/^(?:speed|fastest|fast)$/i],["wifiCoverage",/^(?:wifi|wi-fi|coverage)$/i]];
function clone(v){return JSON.parse(JSON.stringify(v));}
function initialProfile(sessionId){return {sessionId,facts:{},painPoints:[],householdNeeds:[],preferences:{},confidence:{},sources:{},decisions:[],updatedAt:new Date().toISOString()};}
export function getCustomerMemory(sessionId){if(!memoryBySession.has(sessionId))memoryBySession.set(sessionId,initialProfile(sessionId));return clone(memoryBySession.get(sessionId));}
export function updateCustomerMemory(sessionId,patch={}){const c=getCustomerMemory(sessionId);const n={...c,...patch,facts:{...c.facts,...(patch.facts||{})},preferences:{...c.preferences,...(patch.preferences||{})},confidence:{...c.confidence,...(patch.confidence||{})},sources:{...c.sources,...(patch.sources||{})},painPoints:[...new Set([...(c.painPoints||[]),...(patch.painPoints||[])])],householdNeeds:[...new Set([...(c.householdNeeds||[]),...(patch.householdNeeds||[])])],decisions:[...(c.decisions||[]),...(patch.decisions||[])],updatedAt:new Date().toISOString()};memoryBySession.set(sessionId,n);return clone(n);}
export function extractFactsFromMessage(message=""){const text=String(message).trim();const facts={},confidence={},sources={};for(const p of FACT_PATTERNS){if(facts[p.key]!==undefined)continue;const m=text.match(p.regex);if(m?.[1]){facts[p.key]=p.cast?p.cast(m[1]):m[1].trim();confidence[p.key]=.9;sources[p.key]={channel:"conversation",capturedAt:new Date().toISOString(),raw:m[0]};}}const painPoints=PAIN_PATTERNS.filter(([,r])=>r.test(text)).map(([k])=>k);const householdNeeds=NEED_PATTERNS.filter(([,r])=>r.test(text)).map(([k])=>k);const preferences={};for(const [key,re] of PRIORITIES){if(re.test(text)){preferences.primaryPriority=key;break;}}return{facts,confidence,sources,painPoints,householdNeeds,preferences};}
export function learnFromMessage(sessionId,message){return updateCustomerMemory(sessionId,extractFactsFromMessage(message));}
export function clearCustomerMemory(){memoryBySession.clear();}
