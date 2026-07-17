const RULES = [
  ["objection", /\b(too expensive|not interested|think about it|happy with|contract|cancel|trust|why should i|concern)\b/i],
  ["recommendation", /\b(best|recommend|which provider|which plan|compare|option|choose|fiber|cable)\b/i],
  ["orderReadiness", /\b(sign me up|order|buy|ready|install|schedule|move forward|switch today)\b/i],
  ["knowledge", /\b(what is|how does|difference|explain|can i|does it)\b/i],
  ["discovery", /\b(pay|bill|provider|internet|wifi|wi-fi|slow|drop|stream|gaming|work from home|moving|address)\b/i],
];

export function analyzeIntent(message = "", context = {}) {
  const text = String(message).trim();
  const matches = RULES
    .filter(([, regex]) => regex.test(text))
    .map(([intent], index) => ({ intent, confidence: Math.max(0.62, 0.94 - index * 0.05) }));

  if (!matches.length) matches.push({ intent: "discovery", confidence: 0.55 });
  if (context.stage === "OBJECTION" && !matches.some((item) => item.intent === "objection")) {
    matches.unshift({ intent: "objection", confidence: 0.74 });
  }

  return {
    primary: matches[0].intent,
    intents: matches,
    analyzedAt: new Date().toISOString(),
  };
}
