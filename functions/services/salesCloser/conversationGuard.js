const FIELD_QUESTIONS = [
  ["customerName", /who do i have|who am i speaking|what(?:'s| is) your name|your name/i],
  ["phone", /best phone|phone number|number.*(?:call|text)|contact number/i],
  ["email", /best email|email address|send.*email/i],
  ["contactPreference", /prefer.*(?:text|email|phone)|text, email, or.*phone|how.*contact/i],
  ["currentProvider", /who.*(?:using|provider)|current provider|internet today/i],
  ["monthlyBill", /how much.*(?:pay|month)|monthly bill|paying each month/i],
];

const STAGE_ORDER = ["INTRODUCTION", "DISCOVERY", "RECOMMENDATION", "OBJECTION", "CLOSING", "CALLBACK", "QUOTE_READY", "ORDER_READY", "COMPLETED"];

export function isCompletionIntent(message = "") {
  return /^(?:no|nope|not at this time|nothing else|that(?:'s| is) all|i(?:'m| am) good|all set|thank you|thanks)[.! ]*$/i.test(String(message).trim());
}

export function inferStage(memory = {}, quote = null, requestedStage = "DISCOVERY", message = "") {
  const facts = memory.facts || {};
  if (memory.status === "COMPLETED" || memory.stage === "COMPLETED") return "COMPLETED";
  if (isCompletionIntent(message) && (quote?.provider || facts.phone || facts.email)) return "COMPLETED";

  let inferred = facts.customerName ? "DISCOVERY" : "INTRODUCTION";
  if (facts.currentProvider && facts.monthlyBill && ((memory.painPoints || []).length || (memory.preferences || []).length || (memory.householdNeeds || []).length)) inferred = "RECOMMENDATION";
  if (quote?.provider) inferred = "CLOSING";
  if (facts.email && facts.phone && facts.contactPreference && quote?.provider) inferred = "ORDER_READY";

  const currentIndex = STAGE_ORDER.indexOf(memory.stage || "INTRODUCTION");
  const requestedIndex = STAGE_ORDER.indexOf(String(requestedStage || "DISCOVERY").toUpperCase());
  const inferredIndex = STAGE_ORDER.indexOf(inferred);
  return STAGE_ORDER[Math.max(0, currentIndex, requestedIndex, inferredIndex)];
}

export function nextMissingQuestion(memory = {}, quote = null) {
  const facts = memory.facts || {};
  if (!facts.customerName) return "Hey, I’m David, your ConnectIQ Internet Advisor. Who do I have the pleasure of speaking with?";
  if (!facts.currentProvider) return "Who are you using for internet today?";
  if (!facts.monthlyBill) return "About how much are you paying each month now?";
  if (!(memory.painPoints || []).length && !(memory.preferences || []).length) return "What would you most like to improve—price, reliability, speed, or Wi-Fi coverage?";
  if (quote?.provider) {
    if (!facts.email) return "What’s the best email address for your comparison and quote?";
    if (!facts.phone) return "What’s the best phone number in case we have a question about installation or the quote?";
    if (!facts.contactPreference) return "Would you prefer updates by text, email, or phone?";
  }
  return null;
}

export function guardAdvisorMessage({ message = "", memory = {}, quote = null, stage = "DISCOVERY" }) {
  const facts = memory.facts || {};
  const name = facts.preferredName || facts.customerName || "";

  if (stage === "COMPLETED" || memory.status === "COMPLETED") {
    return `Thanks${name ? `, ${String(name).split(/\s+/)[0]}` : ""}. I have everything you shared saved. Your comparison will remain available here, and we’ll follow up using your selected contact method. Have a great day!`;
  }

  for (const [field, pattern] of FIELD_QUESTIONS) {
    if (facts[field] && pattern.test(message)) {
      const replacement = nextMissingQuestion(memory, quote);
      return replacement || `Thanks${name ? `, ${String(name).split(/\s+/)[0]}` : ""}. I have the details I need. Let’s move forward with your best option.`;
    }
  }
  return message;
}
