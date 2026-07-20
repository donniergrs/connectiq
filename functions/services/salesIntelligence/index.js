const SIGNAL_RULES = [
  { id: "high_bill", points: 20, when: ({ facts }) => Number(facts.monthlyBill || 0) >= 100, label: "High current bill" },
  { id: "price_pain", points: 15, when: ({ painPoints }) => painPoints.includes("price"), label: "Wants a lower bill" },
  { id: "reliability_pain", points: 20, when: ({ painPoints }) => painPoints.includes("reliability"), label: "Reliability problem" },
  { id: "speed_pain", points: 12, when: ({ painPoints }) => painPoints.includes("speed"), label: "Speed problem" },
  { id: "work_from_home", points: 12, when: ({ householdNeeds }) => householdNeeds.includes("workFromHome"), label: "Works from home" },
  { id: "gaming", points: 8, when: ({ householdNeeds }) => householdNeeds.includes("gaming"), label: "Gaming household" },
  { id: "streaming", points: 6, when: ({ householdNeeds }) => householdNeeds.includes("streaming"), label: "Streaming household" },
  { id: "asked_to_switch", points: 18, when: ({ message }) => /\b(switch|change providers?|replace|alternatives?|other options?)\b/i.test(message), label: "Exploring a switch" },
  { id: "pricing_question", points: 10, when: ({ message }) => /\b(how much|price|cost|monthly|quote)\b/i.test(message), label: "Asked about pricing" },
  { id: "installation_question", points: 18, when: ({ message }) => /\b(install|installation|appointment|schedule|how soon|asap|today|tomorrow|this week)\b/i.test(message), label: "Asked about installation" },
  { id: "ready_language", points: 22, when: ({ message }) => /\b(sign me up|let'?s do it|move forward|ready to (switch|order|buy)|i want (it|that|to switch))\b/i.test(message), label: "Customer expressed purchase intent" },
  { id: "callback_request", points: 14, when: ({ message }) => /\b(call me|call back|callback|reach me|contact me)\b/i.test(message), label: "Requested follow-up contact" },
  { id: "contactable", points: 15, when: ({ facts }) => Boolean(facts.email || facts.phone), label: "Contact information captured" },
];

function unique(values = []) { return [...new Set(values.filter(Boolean))]; }
function hasSignal(signals, id) { return signals.some((signal) => signal.id === id); }

export function detectBuyingSignals({ message = "", memory = {}, quote = null } = {}) {
  const input = {
    message: String(message),
    facts: memory.facts || {},
    painPoints: memory.painPoints || [],
    householdNeeds: memory.householdNeeds || [],
  };
  const signals = SIGNAL_RULES.filter((rule) => rule.when(input)).map(({ id, points, label }) => ({ id, points, label }));
  if (quote?.provider) signals.push({ id: "recommendation_available", points: 12, label: "Recommendation available" });
  return unique(signals.map((item) => item.id)).map((id) => signals.find((item) => item.id === id));
}

export function calculateLeadScore({ memory = {}, signals = [], quote = null } = {}) {
  let score = 5;
  const facts = memory.facts || {};
  if (facts.serviceAddress) score += 12;
  if (facts.currentProvider) score += 10;
  if (facts.monthlyBill) score += 8;
  if (facts.email) score += 8;
  if (facts.phone) score += 8;
  score += Math.min(55, signals.reduce((total, signal) => total + Number(signal.points || 0), 0));
  if (quote?.provider) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function determinePipelineStage({ memory = {}, signals = [], quote = null, leadScore = 0 } = {}) {
  const facts = memory.facts || {};
  const hasAddress = Boolean(facts.serviceAddress);
  const hasDiscovery = Boolean(facts.currentProvider || facts.monthlyBill || (memory.painPoints || []).length || (memory.householdNeeds || []).length);
  const contactable = Boolean(facts.email || facts.phone);
  const installationIntent = hasSignal(signals, "installation_question");
  const explicitIntent = hasSignal(signals, "ready_language");
  if ((installationIntent || explicitIntent) && contactable && quote?.provider) return "Order Ready";
  if (quote?.provider && (contactable || leadScore >= 70)) return "Quote Ready";
  if (quote?.provider) return "Recommendation Presented";
  if (leadScore >= 55 || (hasDiscovery && contactable)) return "Qualified";
  if (hasDiscovery) return "Discovery";
  if (hasAddress) return "Address Verified";
  return "New Lead";
}

export function determineBuyingIntent({ leadScore = 0, signals = [] } = {}) {
  if (leadScore >= 80 || hasSignal(signals, "installation_question") || hasSignal(signals, "ready_language")) return "High";
  if (leadScore >= 50) return "Medium";
  return "Low";
}

export function determinePriority({ buyingIntent = "Low", leadScore = 0, signals = [] } = {}) {
  if (buyingIntent === "High" || leadScore >= 80 || hasSignal(signals, "ready_language")) return "Hot";
  if (buyingIntent === "Medium" || leadScore >= 50) return "Warm";
  return "Normal";
}

export function calculateCloseProbability({ leadScore = 0, memory = {}, quote = null, signals = [] } = {}) {
  const facts = memory.facts || {};
  let probability = Math.round(leadScore * 0.72);
  if (quote?.provider) probability += 8;
  if (facts.phone || facts.email) probability += 6;
  if (hasSignal(signals, "ready_language")) probability += 12;
  return Math.max(5, Math.min(95, probability));
}

export function identifyLikelyObjection({ memory = {}, signals = [] } = {}) {
  const painPoints = memory.painPoints || [];
  if (painPoints.includes("price") || hasSignal(signals, "high_bill")) return "Price and monthly savings";
  if (painPoints.includes("reliability")) return "Reliability and service consistency";
  if (painPoints.includes("speed")) return "Speed and performance proof";
  return "No primary objection identified yet";
}

export function buildFollowUpPlan({ pipelineStage = "New Lead", memory = {}, signals = [] } = {}) {
  const facts = memory.facts || {};
  const callbackRequested = hasSignal(signals, "callback_request");
  const contactMethod = facts.phone ? "phone" : facts.email ? "email" : "capture_contact";
  const dueInMinutes = pipelineStage === "Order Ready" ? 15 : pipelineStage === "Quote Ready" ? 60 : pipelineStage === "Qualified" ? 240 : 1440;
  return {
    required: ["Qualified", "Recommendation Presented", "Quote Ready", "Order Ready"].includes(pipelineStage) || callbackRequested,
    type: callbackRequested ? "customer_requested_callback" : pipelineStage === "Order Ready" ? "complete_order" : pipelineStage === "Quote Ready" ? "deliver_quote" : "continue_sales_follow_up",
    contactMethod,
    dueInMinutes,
    status: "Open",
  };
}

export function summarizeConversation({ memory = {}, quote = null, pipelineStage = "New Lead" } = {}) {
  const facts = memory.facts || {};
  const parts = [];
  if (facts.currentProvider) parts.push(`Current provider: ${facts.currentProvider}.`);
  if (facts.monthlyBill) parts.push(`Current bill: $${Number(facts.monthlyBill).toFixed(0)}/month.`);
  if ((memory.painPoints || []).length) parts.push(`Pain points: ${memory.painPoints.join(", ")}.`);
  if ((memory.householdNeeds || []).length) parts.push(`Usage: ${memory.householdNeeds.join(", ")}.`);
  if (quote?.provider) parts.push(`Recommended provider: ${quote.provider}.`);
  parts.push(`Pipeline stage: ${pipelineStage}.`);
  return parts.join(" ");
}

export function evaluateSalesIntelligence({ message = "", memory = {}, quote = null } = {}) {
  const signals = detectBuyingSignals({ message, memory, quote });
  const leadScore = calculateLeadScore({ memory, signals, quote });
  const pipelineStage = determinePipelineStage({ memory, signals, quote, leadScore });
  const buyingIntent = determineBuyingIntent({ leadScore, signals });
  const priority = determinePriority({ buyingIntent, leadScore, signals });
  const closeProbability = calculateCloseProbability({ leadScore, memory, quote, signals });
  const followUpPlan = buildFollowUpPlan({ pipelineStage, memory, signals });
  return {
    signals,
    leadScore,
    buyingIntent,
    priority,
    closeProbability,
    likelyObjection: identifyLikelyObjection({ memory, signals }),
    pipelineStage,
    quoteReady: ["Quote Ready", "Order Ready"].includes(pipelineStage),
    orderReady: pipelineStage === "Order Ready",
    nextBestAction: pipelineStage === "Order Ready" ? "prepare_order" : pipelineStage === "Quote Ready" ? "deliver_quote" : pipelineStage === "Recommendation Presented" ? "capture_contact" : pipelineStage === "Qualified" ? "present_recommendation" : "continue_discovery",
    followUpPlan,
    conversationSummary: summarizeConversation({ memory, quote, pipelineStage }),
    evaluatedAt: new Date().toISOString(),
  };
}
