const normalize = (value = "") => String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

export function providerName(provider = {}) {
  return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "Provider";
}

function technology(provider = {}) {
  return String(provider.technology || provider.technologyType || provider.technology_code_type || "Broadband");
}

function techScore(provider = {}, memory = {}) {
  const tech = technology(provider).toLowerCase();
  let score = tech.includes("fiber") || tech.includes("fttp") ? 100 : tech.includes("cable") ? 72 : tech.includes("fixed") ? 48 : tech.includes("dsl") ? 34 : tech.includes("satellite") ? 12 : 50;
  const needs = memory.householdNeeds || [];
  const priorities = new Set([...(memory.preferences || []), ...(memory.painPoints || [])]);
  if ((needs.includes("workFromHome") || priorities.has("reliability")) && (tech.includes("fiber") || tech.includes("fttp"))) score += 18;
  if ((needs.includes("gaming") || priorities.has("speed")) && (tech.includes("fiber") || tech.includes("cable"))) score += 12;
  if (priorities.has("price")) {
    const price = Number(provider.price || provider.monthlyPrice || provider.estimatedMonthlyPrice || 0);
    if (price > 0 && price <= 60) score += 14;
    else if (price > 0 && price <= 80) score += 8;
  }
  return score;
}

function businessScore(provider = {}) {
  const commission = Number(provider.commission || provider.commissionValue || provider.payout || provider.businessValue || 0);
  if (!commission) return 50;
  return Math.max(0, Math.min(100, commission <= 100 ? commission : commission / 10));
}

export function rankProviders(providers = [], memory = {}) {
  const current = normalize(memory.facts?.currentProvider);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  const eligible = providers.filter((provider) => {
    const name = normalize(providerName(provider));
    return name && name !== current && !rejected.has(name);
  });
  const pool = eligible.length ? eligible : providers.filter((provider) => !rejected.has(normalize(providerName(provider))));
  return pool.map((provider) => {
    const fit = techScore(provider, memory);
    const business = businessScore(provider);
    return { provider, name: providerName(provider), fit, business, score: Math.round((business * 0.6 + fit * 0.4) * 10) / 10 };
  }).sort((a, b) => b.score - a.score);
}

function profile(memory = {}) {
  const facts = memory.facts || {};
  const priorities = new Set([...(memory.preferences || []), ...(memory.painPoints || [])]);
  return {
    facts,
    needs: memory.householdNeeds || [],
    priorities,
    hasProvider: Boolean(facts.currentProvider),
    hasBill: Number.isFinite(Number(facts.monthlyBill)) && Number(facts.monthlyBill) > 0,
    hasPriority: priorities.size > 0 || (memory.householdNeeds || []).length > 0,
  };
}

function is(text, regex) { return regex.test(String(text || "").toLowerCase()); }
function explain(top, p) {
  const tech = technology(top.provider);
  const reasons = [];
  if (p.priorities.has("price")) reasons.push("it gives you a strong chance to lower your bill");
  if (p.needs.includes("workFromHome") || p.priorities.has("reliability")) reasons.push(`${tech} is a strong fit for dependable work-from-home use`);
  if (p.needs.includes("gaming") || p.priorities.has("speed")) reasons.push(`${tech} is a strong fit for speed and low-latency use`);
  if (p.priorities.has("wifiCoverage")) reasons.push("we can match the plan with the right whole-home Wi-Fi equipment");
  return reasons.slice(0, 2).join(" and ") || `it is the strongest overall alternative among the providers found for your address`;
}

function objectionType(text) {
  if (is(text, /bad things|heard bad|don.?t trust|terrible|awful|hate/)) return "trust";
  if (is(text, /reliable|reliability|outage|goes out|uptime/)) return "reliability";
  if (is(text, /too expensive|price|cost|how much|monthly|fees?/)) return "price";
  if (is(text, /contract|cancel|early termination/)) return "contract";
  if (is(text, /install|installation|technician|how long/)) return "installation";
  if (is(text, /mobile|wireless|cell phone|bundle/)) return "bundle";
  if (is(text, /don.?t want|not interested|show.*alternative|anything but/)) return "alternative";
  return null;
}

function objectionResponse(type, top, ranked, p) {
  const name = top.name;
  if (type === "trust") return `That is a fair concern. I would not ask you to switch based on the brand name alone. For ${name}, we should verify the exact technology, total monthly cost, equipment, installation terms, and recent address-specific service details before you decide. Based on your needs, it still deserves comparison because ${explain(top, p)}.`;
  if (type === "reliability") return `${name} appears to be a strong reliability fit because its listed technology is ${technology(top.provider)}. Actual performance can vary by address, so ConnectIQ will confirm the service type and installation details before submitting anything.`;
  if (type === "price") return `I do not want to guess at the final price. The Quote Builder will use any verified plan price we have, then ConnectIQ will confirm promotions, equipment, taxes, and installation charges before the order is submitted.`;
  if (type === "contract") return `We will verify whether your current service has an early-termination obligation and whether the new plan has a contract. Nothing should be submitted until those terms are clear.`;
  if (type === "installation") return `Installation timing depends on the provider and address. We will confirm the earliest appointment, whether a technician is required, and any installation charge before you approve the order.`;
  if (type === "bundle") return `Some providers offer mobile or wireless bundles, but availability and savings vary. I will treat that as an optional comparison and keep the internet recommendation focused on the best service fit.`;
  if (type === "alternative") {
    const alternatives = ranked.slice(1, 4).map((item) => item.name);
    return alternatives.length ? `Understood. I will exclude that option. The next alternatives are ${alternatives.join(", ")}. I can compare the first two on reliability, technology, and expected total cost.` : `Understood. I will exclude that option. I do not yet have another eligible provider from the address results, so the next step is a manual availability review.`;
  }
  return null;
}

export function orchestrateSalesResponse({ message = "", memory = {}, providers = [], quote = null } = {}) {
  const p = profile(memory);
  const ranked = rankProviders(providers, memory);
  const top = ranked[0] || null;
  const text = String(message || "").trim();
  const objection = objectionType(text);

  if (!p.hasProvider) return { stage: "DISCOVERY", nextAction: "ask_current_provider", selectedProvider: null, message: "Who is your current internet provider?", suggestedReplies: ["Spectrum", "AT&T", "Xfinity"] };
  if (!p.hasBill) return { stage: "DISCOVERY", nextAction: "ask_monthly_bill", selectedProvider: null, message: `Thanks—I have ${p.facts.currentProvider} as your current provider. About how much do you pay each month?`, suggestedReplies: ["$75 a month", "$100 a month", "$125 a month"] };
  if (!p.hasPriority) return { stage: "DISCOVERY", nextAction: "ask_priority", selectedProvider: null, message: "What would you most like to improve: lower price, better reliability, faster speed, or stronger Wi-Fi coverage?", suggestedReplies: ["Lower my bill", "Better reliability", "Faster speed"] };
  if (!top) return { stage: "RECOMMENDATION", nextAction: "manual_review", selectedProvider: null, message: "I have enough information about your needs, but I do not have an eligible alternative provider in the current address results. I’ll preserve your details for a manual availability review.", suggestedReplies: ["Talk to an advisor"] };

  if (objection) return { stage: "OBJECTION", nextAction: objection === "alternative" ? "present_alternative" : "resolve_objection", selectedProvider: top.provider, selectedProviderName: top.name, message: objectionResponse(objection, top, ranked, p), suggestedReplies: objection === "alternative" ? ["Compare the first two", "Which is most reliable?"] : ["Compare alternatives", "Show total cost", "Continue"] };

  if (is(text, /what do you suggest|what.*recommend|best option|which.*choose|what should i do/)) {
    return { stage: "RECOMMENDATION", nextAction: "present_recommendation", selectedProvider: top.provider, selectedProviderName: top.name, message: `Based on what you told me, I recommend ${top.name} because ${explain(top, p)}. I have excluded ${p.facts.currentProvider} from the switch recommendation. Final serviceability and pricing still need confirmation.`, suggestedReplies: ["Why is it best?", "Show alternatives", "Continue to order details"] };
  }
  if (is(text, /why.*best|why.*recommend|explain/)) return { stage: "RECOMMENDATION", nextAction: "explain_recommendation", selectedProvider: top.provider, selectedProviderName: top.name, message: `${top.name} leads because ${explain(top, p)}. Its listed technology is ${technology(top.provider)}, and it scored highest after balancing customer fit with ConnectIQ business value.`, suggestedReplies: ["Show alternatives", "Continue to order details"] };
  if (is(text, /what.*next|move forward|proceed|continue to order|ready|sign me up/)) return { stage: "ORDER_READY", nextAction: "continue_to_order", selectedProvider: top.provider, selectedProviderName: top.name, message: `The next step is to confirm the exact ${top.name} plan, monthly price, equipment, installation appointment, and your contact information. Nothing will be submitted until you approve those details.`, suggestedReplies: ["Review my quote", "Enter order details"] };
  if (is(text, /no thanks|not now|stop|done/)) return { stage: "COMPLETED", nextAction: "complete_conversation", selectedProvider: top.provider, selectedProviderName: top.name, message: `No problem. I’ve preserved the comparison and recommendation for ${top.name}. You can start a new conversation whenever you are ready.`, suggestedReplies: [] };

  return { stage: "RECOMMENDATION", nextAction: "present_recommendation", selectedProvider: top.provider, selectedProviderName: top.name, message: `I have enough information to make a recommendation. ${top.name} is my leading option because ${explain(top, p)}. Would you like the reason, the alternatives, or the next order step?`, suggestedReplies: ["Why is it best?", "Show alternatives", "What do I do next?"] };
}
