function has(message, pattern) { return pattern.test(String(message || "")); }

export function planAgentTurn({ message, memory = {}, intent = {}, providers = [], quote = null }) {
  const text = String(message || "");
  let action = intent.primary || "answer_question";
  if (has(text, /\b(human|person|representative|call me)\b/i)) action = "human_handoff";
  else if (has(text, /\b(how reliable|reliability|outage|uptime)\b/i)) action = "answer_reliability";
  else if (has(text, /\b(how much|price|cost|monthly|quote)\b/i)) action = quote ? "explain_quote" : "answer_pricing";
  else if (has(text, /\b(don'?t want|do not want|not interested|exclude|remove)\b/i)) action = "reject_and_rerank";
  else if (has(text, /\b(why|how did you choose|reason)\b/i)) action = "explain_recommendation";
  else if (has(text, /\b(other|alternative|else|compare)\b/i)) action = "compare_alternatives";
  else if (has(text, /\b(order|sign me up|move forward|proceed)\b/i)) action = "prepare_order";
  else if (has(text, /\b(mobile|cell phone|wireless bundle)\b/i)) action = "answer_mobile";
  else if (has(text, /\b(install|appointment|technician)\b/i)) action = "answer_installation";
  else if (Object.keys(memory.facts || {}).length || providers.length) action = "continue_consultative_conversation";

  return {
    action,
    answerFirst: true,
    askAtMostOneQuestion: true,
    preserveContext: true,
    neverRepeatKnownFacts: true,
    providerSpecificClaimsRequireEvidence: true,
  };
}
