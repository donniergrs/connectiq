function includesAny(values = [], candidates = []) {
  return candidates.some((candidate) => values.includes(candidate));
}

function hasContact(facts = {}) {
  return Boolean(facts.email || facts.phone);
}

export function detectCustomerEmotion({ message = "", memory = {} } = {}) {
  const text = String(message).toLowerCase();
  if (/\b(frustrated|furious|angry|fed up|hate|terrible|awful|keeps going out|outages?|again)\b/.test(text)) return "frustrated";
  if (/\b(worried|concerned|nervous|not sure|skeptical|don't trust|do not trust)\b/.test(text)) return "cautious";
  if (/\b(excited|great|perfect|love that|sounds good|let'?s do it|ready)\b/.test(text)) return "positive";
  if (/\b(just looking|shopping around|researching|comparing|curious)\b/.test(text)) return "exploratory";
  return memory.relationship?.emotion || "neutral";
}

export function determinePrimaryMotivation({ memory = {}, message = "" } = {}) {
  const preferences = memory.preferences || [];
  const pains = memory.painPoints || [];
  const needs = memory.householdNeeds || [];
  const text = String(message).toLowerCase();

  if (includesAny(preferences, ["price"]) || includesAny(pains, ["price"]) || /\b(cheapest|save|lower bill|too expensive|cost)\b/.test(text)) return "savings";
  if (includesAny(preferences, ["reliability"]) || includesAny(pains, ["reliability"]) || includesAny(needs, ["workFromHome"]) || /\b(reliable|outage|disconnect|work from home)\b/.test(text)) return "reliability";
  if (includesAny(preferences, ["speed"]) || includesAny(pains, ["speed"]) || includesAny(needs, ["gaming", "streaming"]) || /\b(gaming|latency|fastest|speed|upload)\b/.test(text)) return "performance";
  if (includesAny(preferences, ["wifiCoverage"]) || includesAny(pains, ["wifiCoverage"]) || /\b(dead zone|coverage|whole home|upstairs|wifi)\b/.test(text)) return "coverage";
  return memory.relationship?.primaryMotivation || "undetermined";
}

export function classifyCustomerPersona({ memory = {}, message = "", emotion = "neutral", motivation = "undetermined" } = {}) {
  const text = String(message).toLowerCase();
  if (/\b(just looking|shopping around|researching|comparing|not ready)\b/.test(text) || emotion === "exploratory") return "skeptical_shopper";
  if (/\b(sign me up|let'?s do it|ready to|move forward|order|install)\b/.test(text)) return "ready_buyer";
  if (emotion === "frustrated") return "frustrated_switcher";
  if (motivation === "savings") return "budget_conscious";
  if (motivation === "reliability") return "reliability_focused";
  if (motivation === "performance") return "performance_enthusiast";
  if (motivation === "coverage") return "coverage_focused";
  return hasContact(memory.facts) ? "engaged_prospect" : "general_shopper";
}

export function determineReadiness({ memory = {}, message = "", quote = null } = {}) {
  const text = String(message).toLowerCase();
  if (/\b(sign me up|let'?s do it|ready to (buy|switch|order)|move forward|schedule install)\b/.test(text)) return "ready_to_close";
  if (/\b(quote|how much|price|install|availability|which one|recommend)\b/.test(text) || quote?.provider) return "considering";
  if (/\b(just looking|researching|shopping around|not ready)\b/.test(text)) return "early_research";
  if ((memory.painPoints || []).length || (memory.preferences || []).length || (memory.householdNeeds || []).length) return "engaged_discovery";
  return "initial";
}

function strategyForPersona(persona, emotion, motivation, readiness) {
  const base = {
    tone: "warm, confident, consultative",
    emphasis: motivation,
    avoid: [],
    objective: "advance the sale by one natural step",
  };
  if (persona === "budget_conscious") return { ...base, tone: "practical and reassuring", emphasis: "monthly savings and total value", proofStyle: "compare against the current bill", objective: readiness === "considering" ? "offer a verified quote" : "quantify the current cost problem" };
  if (persona === "reliability_focused") return { ...base, tone: emotion === "frustrated" ? "empathetic and decisive" : "calm and credible", emphasis: "reliability, consistency, and risk reduction", proofStyle: "connect service quality to work and household impact", objective: "recommend the most dependable verified option" };
  if (persona === "performance_enthusiast") return { ...base, tone: "knowledgeable and energetic", emphasis: "latency, upload performance, and consistent speed", proofStyle: "translate technical performance into real activities", objective: "match the customer to the strongest performance fit" };
  if (persona === "coverage_focused") return { ...base, tone: "helpful and solution-oriented", emphasis: "whole-home Wi-Fi and equipment placement", proofStyle: "separate provider speed from in-home coverage", objective: "identify whether service or Wi-Fi design is the real problem" };
  if (persona === "skeptical_shopper") return { ...base, tone: "low-pressure and educational", emphasis: "clarity and transparent comparison", proofStyle: "explain tradeoffs without forcing a choice", avoid: ["premature contact request", "hard close"], objective: "earn permission for the next step" };
  if (persona === "frustrated_switcher") return { ...base, tone: "empathetic, concise, and action-oriented", emphasis: "ending the current pain quickly", proofStyle: "acknowledge the disruption before recommending", objective: "present the best credible alternative" };
  if (persona === "ready_buyer") return { ...base, tone: "confident and efficient", emphasis: "clear next steps and completion", proofStyle: "confirm only essential details", avoid: ["unnecessary discovery"], objective: "capture required contact details and prepare the order" };
  return base;
}

export function evaluateAdaptiveSalesStrategy({ memory = {}, message = "", quote = null } = {}) {
  const emotion = detectCustomerEmotion({ message, memory });
  const primaryMotivation = determinePrimaryMotivation({ memory, message });
  const persona = classifyCustomerPersona({ memory, message, emotion, motivation: primaryMotivation });
  const readiness = determineReadiness({ memory, message, quote });
  const strategy = strategyForPersona(persona, emotion, primaryMotivation, readiness);
  return {
    persona,
    emotion,
    primaryMotivation,
    readiness,
    tone: strategy.tone,
    emphasis: strategy.emphasis,
    proofStyle: strategy.proofStyle || "use plain-language customer outcomes",
    avoid: strategy.avoid,
    objective: strategy.objective,
    detectedAt: new Date().toISOString(),
  };
}
