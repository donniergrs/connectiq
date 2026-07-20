const DEFINITIONS = [
  ["quote", /\b(build|create|show|review|prepare|give me)\b.*\bquote\b|\bquote\b/i],
  ["alternatives", /\b(show|compare|list|what are)\b.*\b(alternative|option|provider)s?\b|\balternatives?\b/i],
  ["explanation", /\bwhy\b.*\b(best|recommend|recommended|leading|choose|chosen)\b|\bwhy is (?:it|that) best\b/i],
  ["mobile", /\b(mobile|wireless|cell(?:ular)?|phone plan|cell phone)\b/i],
  ["installation", /\b(install|installation|technician|appointment|how long|schedule)\b/i],
  ["pricing", /\b(how much|cost|price|pricing|monthly|per month|promotion|promo|fee|fees)\b/i],
  ["current_provider_correction", /\b(actually|correction|i'm actually|i am actually|not anymore|now with)\b.*\b(at&t|att|spectrum|xfinity|comcast|frontier|verizon|cox|lumos|windstream|t-mobile|tmobile)\b/i],
  ["recommendation", /\b(best|recommend|recommendation|which provider|which plan|what should i choose)\b/i],
  ["human_handoff", /\b(human|person|representative|agent|call me|talk to someone)\b/i],
  ["discovery", /\b(pay|bill|provider|internet|wifi|wi-fi|stream|netflix|gaming|work from home|remote work|kids|budget|upstairs|coverage|slow|outage)\b/i],
];

export function classifyIntents(message = "") {
  const text = String(message).trim();
  const intents = DEFINITIONS.filter(([, regex]) => regex.test(text)).map(([intent], index) => ({ intent, confidence: Math.max(0.72, 0.98 - index * 0.03) }));
  if (!intents.length) intents.push({ intent: "general_question", confidence: 0.55 });
  return { primary: intents[0].intent, intents, analyzedAt: new Date().toISOString() };
}
