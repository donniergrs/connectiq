import { INTENTS } from "./constants.js";
import { INTENT_PATTERNS } from "./lexicon.js";

export function classifyIntent(text) {
  const matches = INTENT_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ intent, confidence, pattern }) => ({
      intent,
      confidence,
      evidence: text.match(pattern)?.[0] || text,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  if (!matches.length) {
    const question = /\?|^(who|what|when|where|why|how|can|could|would|is|are|do|does)\b/i.test(text);
    return {
      primary: question ? INTENTS.ASK_QUESTION : INTENTS.PROVIDE_INFORMATION,
      confidence: question ? 0.72 : 0.65,
      secondary: [],
      evidence: [],
    };
  }

  return {
    primary: matches[0].intent,
    confidence: matches[0].confidence,
    secondary: matches.slice(1, 4).map(({ intent, confidence }) => ({ intent, confidence })),
    evidence: matches.map(({ intent, evidence }) => ({ intent, evidence })),
  };
}
