const RULES = [
  ["pricing", /\b(how much|price|cost|monthly|per month|fees?|tax|promotion|discount|cheap|expensive)\b/i],
  ["reliability", /\b(reliable|reliability|outage|go down|downtime|stable|stability|uptime|dependable)\b/i],
  ["service_quality", /\b(how is .*service|service good|quality|experience|reviews?)\b/i],
  ["mobile", /\b(mobile|wireless|cell phone|cellular|phone plan|bundle.*phone)\b/i],
  ["installation", /\b(install|installation|technician|appointment|bury|drill|how long.*setup|self install)\b/i],
  ["wifi", /\b(wi[ -]?fi|router|mesh|upstairs|coverage|dead zone|extender)\b/i],
  ["speed", /\b(speed|fast|mbps|gig|download|upload|latency|ping|gaming|zoom|stream)\b/i],
  ["contract", /\b(contract|commitment|cancel|cancellation|early termination|term)\b/i],
  ["equipment", /\b(modem|router|equipment|gateway|ont|device)\b/i],
  ["comparison", /\b(compare|versus|vs\.?|alternative|other option|better than|why .* over)\b/i],
  ["quote", /\b(quote|estimate|total|build.*quote|order)\b/i],
  ["support", /\b(support|customer service|repair|technical support|help desk)\b/i],
  ["voice", /\b(landline|home phone|voice|port.*number|911)\b/i],
  ["tv", /\b(tv|television|channels|streaming package|sports package|dvr)\b/i],
  ["business", /\b(business internet|small business|static ip|sla|commercial)\b/i],
  ["objection_price", /\b(too expensive|can't afford|costs too much)\b/i],
  ["objection_switching", /\b(don't want to switch|hate switching|too much trouble|keep my provider)\b/i],
  ["rejection", /\b(i do not want|i don't want|not interested in|exclude|remove)\b/i],
  ["general_question", /\?$/],
];

export function classifyQuestion(message = "") {
  const matches = RULES.filter(([, rx]) => rx.test(String(message))).map(([intent]) => intent);
  return { primary: matches[0] || "general_question", intents: [...new Set(matches)] };
}
