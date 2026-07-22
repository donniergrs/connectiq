const normalize = (value = "") => String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const says = (text, regex) => regex.test(String(text || "").toLowerCase());

export function providerName(provider = {}) {
  return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "Provider";
}

function technology(provider = {}) {
  return String(provider.technology || provider.technologyType || provider.technology_code_type || "Broadband");
}

function priceOf(provider = {}) {
  const value = Number(provider.price || provider.monthlyPrice || provider.estimatedMonthlyPrice || provider.startingPrice || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function maxDown(provider = {}) {
  const value = Number(provider.maxdown || provider.maxDown || provider.downloadSpeed || provider.maxDownload || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function businessScore(provider = {}) {
  const commission = Number(provider.commission || provider.commissionValue || provider.payout || provider.businessValue || 0);
  if (!commission) return 50;
  return Math.max(0, Math.min(100, commission <= 100 ? commission : commission / 10));
}

function fitScore(provider = {}, memory = {}) {
  const tech = technology(provider).toLowerCase();
  const facts = memory.facts || {};
  const needs = new Set(memory.householdNeeds || []);
  const priorities = new Set([...(memory.preferences || []), ...(memory.painPoints || [])]);
  let score = /fiber|fttp/.test(tech) ? 100 : /cable|docsis/.test(tech) ? 78 : /fixed|5g/.test(tech) ? 52 : /dsl/.test(tech) ? 30 : /satellite/.test(tech) ? 10 : 45;
  if ((priorities.has("reliability") || needs.has("workFromHome")) && /fiber|fttp/.test(tech)) score += 22;
  if ((priorities.has("speed") || needs.has("gaming") || needs.has("streaming")) && /fiber|fttp|cable|docsis/.test(tech)) score += 13;
  const price = priceOf(provider);
  if ((priorities.has("price") || facts.decisionPriority === "price") && price) score += price <= 60 ? 18 : price <= 80 ? 10 : 0;
  return score;
}

export function rankProviders(providers = [], memory = {}) {
  const current = normalize(memory.facts?.currentProvider);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  return providers
    .filter((provider) => {
      const name = normalize(providerName(provider));
      return name && name !== current && !rejected.has(name);
    })
    .map((provider) => {
      const fit = fitScore(provider, memory);
      const business = businessScore(provider);
      return { provider, name: providerName(provider), fit, business, score: Math.round((business * 0.6 + fit * 0.4) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score || b.fit - a.fit);
}

function profile(memory = {}) {
  const facts = memory.facts || {};
  const priorities = new Set([...(memory.preferences || []), ...(memory.painPoints || [])]);
  const needs = new Set(memory.householdNeeds || []);
  return {
    facts, priorities, needs,
    hasProvider: Boolean(facts.currentProvider),
    hasName: Boolean(facts.customerName || facts.preferredName),
    hasMotivation: priorities.size > 0 || Boolean(facts.problemDescription),
    hasBill: Number(facts.monthlyBill) > 0,
    hasUsage: needs.size > 0 || Boolean(facts.usageImpact),
    hasPriority: Boolean(facts.decisionPriority),
    hasTimeline: Boolean(facts.switchIntent || facts.buyingTimeline),
    hasEmail: Boolean(facts.email),
    hasPhone: Boolean(facts.phone),
    hasPreference: Boolean(facts.contactPreference),
    hasBestTime: Boolean(facts.bestContactTime),
    hasPermission: typeof facts.followUpPermission === "boolean",
  };
}

function discoveryQuestion(p) {
  const provider = p.facts.currentProvider || "your current provider";
  const name = p.facts.preferredName || p.facts.customerName || "there";
  if (!p.hasProvider) return { action: "ask_current_provider", message: "Who is your current internet provider today?", replies: ["Spectrum", "AT&T", "Xfinity"] };
  if (!p.hasName) return { action: "ask_name", message: `Thanks. I see you currently have ${provider}. Who do I have the pleasure of speaking with?`, replies: [] };
  if (!p.hasMotivation) return { action: "ask_primary_motivation", message: `Thanks, ${name}. What made you start looking for a different provider today—price, reliability, speed, Wi-Fi coverage, or something else?`, replies: ["My bill is too high", "Reliability problems", "I need faster speed"] };
  if (!p.hasBill) return { action: "ask_monthly_bill", message: `About how much are you paying ${provider} each month?`, replies: ["$75 a month", "$100 a month", "$125 a month"] };
  if (!p.hasUsage) return { action: "ask_customer_impact", message: "How does your household use the internet most—working from home, streaming, gaming, schoolwork, or general browsing?", replies: ["Work from home", "Streaming", "Gaming"] };
  if (!p.hasPriority) return { action: "ask_decision_priority", message: "What matters most in the new service: a lower price, stronger reliability, faster speed, or the best balance of all three?", replies: ["Lower price", "Reliability", "Best balance"] };
  if (!p.hasTimeline) return { action: "ask_switch_intent", message: "If we find a better fit and confirm the final price, how soon would you like to switch?", replies: ["As soon as possible", "Within 30 days", "Just comparing"] };
  return null;
}

function fitReason(item, p) {
  const tech = technology(item.provider);
  const reasons = [];
  if (p.priorities.has("price") || p.facts.decisionPriority === "price") reasons.push("worth checking for lower total monthly cost");
  if (p.priorities.has("reliability") || p.needs.has("workFromHome")) reasons.push(`${tech} may be a stronger reliability fit`);
  if (p.priorities.has("speed") || p.needs.has("gaming") || p.needs.has("streaming")) reasons.push(`${tech} fits higher-bandwidth use`);
  return reasons.slice(0, 2).join(" and ") || `${tech} is one of the strongest eligible alternatives at the address`;
}

export function detectComparisonIntent(text = "") {
  const value = String(text || "").toLowerCase();
  if (/cheapest|lowest price|least expensive|save the most|lowest monthly/.test(value)) return "cheapest";
  if (/pricing|prices?|cost|monthly|fees?|how much/.test(value)) return "price";
  if (/most reliable|reliability|reliable|uptime|outage/.test(value)) return "reliability";
  if (/fastest|speed|download|upload/.test(value)) return "speed";
  if (/best value|value|balance/.test(value)) return "value";
  if (/fiber only|only fiber|want fiber/.test(value)) return "fiber";
  if (/cable only|only cable/.test(value)) return "cable";
  return null;
}

function optionsMessage(ranked, p) {
  const options = ranked.slice(0, 3);
  if (!options.length) return "I do not have an eligible alternative in the current results, so a ConnectIQ advisor needs to complete a manual serviceability review.";
  const lines = options.map((item, index) => `${index + 1}. ${item.name} (${technology(item.provider)}): ${fitReason(item, p)}.`).join("\n");
  return `Based on what you told me, these are the three strongest options to verify:\n${lines}\nI excluded ${p.facts.currentProvider || "your current provider"} and any provider you rejected. Exact plans, pricing, and final serviceability still need to be confirmed. Would you like to compare pricing, reliability, speed, or focus on one provider?`;
}

function selectedFromMessage(text, ranked) {
  const normalized = normalize(text);
  const ordinal = String(text).match(/\b(?:option\s*)?(1|2|3|first|second|third)\b/i)?.[1]?.toLowerCase();
  const index = ordinal === "1" || ordinal === "first" ? 0 : ordinal === "2" || ordinal === "second" ? 1 : ordinal === "3" || ordinal === "third" ? 2 : -1;
  if (index >= 0 && ranked[index]) return ranked[index];
  return ranked.find((item) => normalized.includes(normalize(item.name))) || null;
}

function isAcceptance(text = "") {
  return says(text, /^(?:ok|okay|yes|yeah|yep|sure|that works|sounds good|go ahead|continue|please do|looks good)[.! ]*$/);
}

function isDecline(text = "") {
  return says(text, /^(?:no|nope|no thanks|not now|not at this time|nothing else|that(?:'s| is) all|i(?:'m| am) good|all set|thank you|thanks|stop|done)[.! ]*$/);
}

function providerQuestion(text = "") {
  return says(text, /why\s+|why did you pick|why.*recommend|how reliable|how much|price|cost|fees?|contract|install|mobile|bundle|tell me about|compare/);
}

function compareMessage(intent, ranked, p) {
  const items = ranked.slice(0, 3);
  if (!items.length) return "I do not have enough eligible options for a comparison, so a ConnectIQ advisor will complete a manual review.";
  const label = intent === "cheapest" ? "lowest monthly cost" : intent === "price" ? "pricing and total monthly cost" : intent === "reliability" ? "reliability" : intent === "speed" ? "speed" : intent === "fiber" ? "fiber options" : intent === "cable" ? "cable options" : "overall value";
  const filtered = intent === "fiber" ? items.filter((item) => /fiber|fttp/i.test(technology(item.provider))) : intent === "cable" ? items.filter((item) => /cable|docsis/i.test(technology(item.provider))) : items;
  const source = filtered.length ? filtered : items;
  const lines = source.map((item, index) => {
    const price = priceOf(item.provider);
    const speed = maxDown(item.provider);
    const details = [];
    details.push(technology(item.provider));
    if ((intent === "price" || intent === "cheapest" || intent === "value") && price) details.push(`listed from about $${price}/month`);
    if (intent === "speed" && speed) details.push(`up to ${speed} Mbps in the current data`);
    details.push(fitReason(item, p));
    return `${index + 1}. ${item.name}: ${details.join("; ")}.`;
  }).join("\n");
  return `Absolutely. I will compare the top options by ${label} instead of choosing a provider for you.\n${lines}\nAny exact plan, promotion, equipment charge, installation fee, tax, and final serviceability still must be verified. I can send this comparison and have a ConnectIQ Internet Advisor call you as soon as possible.`;
}

function answerProviderQuestion(text, selected, ranked, p) {
  const item = selected || ranked[0];
  if (!item) return "I do not have enough verified information to answer that yet, so a ConnectIQ advisor will confirm it during follow-up.";
  if (says(text, /how much|price|cost|fees?/)) return `I do not have a verified address-specific total for ${item.name} yet, so I will not invent one. We will compare the confirmed plan, equipment, installation, taxes, and promotions against your current $${p.facts.monthlyBill || "—"} monthly bill.`;
  if (says(text, /reliable|reliability/)) return `${item.name} is worth investigating because ${fitReason(item, p)}. Final reliability depends on the exact technology and serviceability confirmed at your address.`;
  if (says(text, /why/)) return `${item.name} is on the list because ${fitReason(item, p)}. It is not a final selection yet; we will verify the exact plan and total cost before you decide.`;
  if (says(text, /compare/)) return compareMessage(detectComparisonIntent(text) || "value", ranked, p);
  if (says(text, /contract/)) return "We will verify contract terms and any cancellation obligations before an order is submitted.";
  if (says(text, /install/)) return "We will confirm technician requirements, installation timing, and every installation charge before you approve anything.";
  if (says(text, /mobile|bundle/)) return "We can include eligible mobile or bundle savings during follow-up, while keeping the internet recommendation centered on your main needs.";
  return `${item.name} is one of the strongest eligible alternatives because ${fitReason(item, p)}.`;
}

function summary(p, selected, ranked, comparisonIntent) {
  const name = p.facts.preferredName || p.facts.customerName || "there";
  const focus = selected?.name || (comparisonIntent ? `${comparisonIntent === "price" ? "pricing" : comparisonIntent} across ${ranked.slice(0, 3).map((item) => item.name).join(", ")}` : ranked.slice(0, 2).map((item) => item.name).join(" and ")) || "the best available options";
  const goals = [...new Set([...(p.priorities || []), p.facts.decisionPriority].filter(Boolean))].join(", ") || "better overall value";
  const usage = [...p.needs].join(", ") || p.facts.usageImpact || "general household use";
  return `Thanks, ${name}. I have your current provider as ${p.facts.currentProvider || "not provided"}, your current bill at about $${p.facts.monthlyBill || "—"} per month, and your priorities as ${goals}. Your main usage is ${usage}, and the follow-up will focus on ${focus}. A ConnectIQ Internet Advisor will call you ${p.facts.bestContactTime === "as soon as possible" ? "as soon as possible" : p.facts.bestContactTime ? `during the ${p.facts.bestContactTime}` : "as soon as possible"} to verify exact availability, pricing, and next steps. Nothing will be submitted without your approval.`;
}

function nextActionLabel(p, comparisonIntent, selected) {
  if (p.facts.bestContactTime === "as soon as possible") return "Call ASAP";
  if (selected) return `Verify and quote ${selected.name}`;
  if (comparisonIntent) return `Send ${comparisonIntent} comparison`;
  return "Review provider options";
}

export function orchestrateSalesResponse({ message = "", memory = {}, providers = [] } = {}) {
  const text = String(message || "").trim();
  const p = profile(memory);
  const ranked = rankProviders(providers, memory);
  const explicitChoice = selectedFromMessage(text, ranked);
  const rememberedChoice = ranked.find((item) => normalize(item.name) === normalize(memory.selectedProvider?.name || memory.selectedProvider || "")) || null;
  const intent = detectComparisonIntent(text) || p.facts.comparisonIntent || null;
  const chosen = explicitChoice || rememberedChoice;
  const top = chosen || ranked[0] || null;

  const intelligence = {
    comparisonIntent: intent,
    comparisonProviders: ranked.slice(0, 3).map((item) => item.name),
    nextActionLabel: nextActionLabel(p, intent, chosen),
    leadSummary: summary(p, chosen, ranked, intent),
  };

  if (isDecline(text) && memory.lastNextAction !== "ask_followup_permission") {
    return { ...intelligence, stage: "COMPLETED", nextAction: "complete_conversation", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "No problem. I have saved the information you shared so a ConnectIQ advisor can follow up only as permitted. Thank you for considering ConnectIQ.", suggestedReplies: [] };
  }

  if (memory.lastNextAction === "close_conversation" || memory.lastNextAction === "complete_conversation") {
    return { ...intelligence, stage: "COMPLETED", nextAction: "complete_conversation", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "Your information is saved and a ConnectIQ advisor will follow up as requested. Thank you for choosing ConnectIQ.", suggestedReplies: [] };
  }

  const question = discoveryQuestion(p);
  if (question) {
    if (providerQuestion(text) && top) {
      return { ...intelligence, stage: "DISCOVERY", nextAction: question.action, selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: `${answerProviderQuestion(text, chosen || top, ranked, p)} I need one more detail before we narrow the options. ${question.message}`, suggestedReplies: question.replies };
    }
    return { ...intelligence, stage: "DISCOVERY", nextAction: question.action, selectedProvider: null, selectedProviderName: null, message: question.message, suggestedReplies: question.replies };
  }

  if (!ranked.length) return { ...intelligence, stage: "RECOMMENDATION", nextAction: "manual_review", selectedProvider: null, selectedProviderName: null, message: "I have your needs saved, but I do not have an eligible alternative in the current results. A ConnectIQ advisor will complete a manual serviceability review.", suggestedReplies: ["Have an advisor call me"] };

  if (!memory.lastNextAction || (memory.lastNextAction.startsWith("ask_switch"))) {
    return { ...intelligence, stage: "RECOMMENDATION", nextAction: "present_options", selectedProvider: null, selectedProviderName: null, message: optionsMessage(ranked, p), suggestedReplies: ["Compare pricing", "Compare reliability", "Compare speed"] };
  }

  if (memory.lastNextAction === "present_options" || memory.lastNextAction === "ask_option_interest") {
    if (intent && !explicitChoice) {
      return { ...intelligence, stage: "COMPARISON", nextAction: "ask_comparison_interest", selectedProvider: null, selectedProviderName: null, message: `${compareMessage(intent, ranked, p)} Would you like me to save this comparison and arrange the follow-up?`, suggestedReplies: ["Yes, arrange the call", "I have a question", "No thanks"] };
    }
    if (explicitChoice) {
      return { ...intelligence, stage: "CLOSING", nextAction: "ask_email", selectedProvider: explicitChoice.provider, selectedProviderName: explicitChoice.name, message: `Great. We will focus first on ${explicitChoice.name}. I would like to send you the comparison and have a ConnectIQ Internet Advisor call you as soon as possible. What is the best email address?`, suggestedReplies: [] };
    }
    if (isAcceptance(text)) {
      return { ...intelligence, stage: "CLOSING", nextAction: "ask_email", selectedProvider: null, selectedProviderName: null, message: "Great. I will preserve all three options for comparison rather than choosing one for you. What is the best email address for the comparison and follow-up?", suggestedReplies: [] };
    }
    if (providerQuestion(text)) {
      return { ...intelligence, stage: "RECOMMENDATION", nextAction: "ask_option_interest", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: `${answerProviderQuestion(text, chosen || top, ranked, p)} Would you like to compare pricing, reliability, speed, or focus on one provider?`, suggestedReplies: ["Compare pricing", "Compare reliability", "Compare speed"] };
    }
    return { ...intelligence, stage: "RECOMMENDATION", nextAction: "ask_option_interest", selectedProvider: null, selectedProviderName: null, message: optionsMessage(ranked, p), suggestedReplies: ["Compare pricing", "Compare reliability", "Compare speed"] };
  }

  if (memory.lastNextAction === "ask_comparison_interest") {
    if (providerQuestion(text) && !isAcceptance(text)) {
      return { ...intelligence, stage: "COMPARISON", nextAction: "ask_comparison_interest", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: `${answerProviderQuestion(text, chosen || top, ranked, p)} Would you like me to save the comparison and arrange the follow-up?`, suggestedReplies: ["Yes, arrange the call", "No thanks"] };
    }
    if (isAcceptance(text)) {
      return { ...intelligence, stage: "CLOSING", nextAction: "ask_email", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "Great. What is the best email address for your provider comparison and follow-up?", suggestedReplies: [] };
    }
  }

  if (providerQuestion(text) && !/^ask_(?:email|phone|contact_preference|best_contact_time|followup_permission)$/.test(memory.lastNextAction || "")) {
    return { ...intelligence, stage: "COMPARISON", nextAction: memory.lastNextAction || "ask_comparison_interest", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: answerProviderQuestion(text, chosen || top, ranked, p), suggestedReplies: ["Arrange the follow-up", "Compare another factor"] };
  }

  if (!p.hasEmail) return { ...intelligence, stage: "CLOSING", nextAction: "ask_email", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "What is the best email address for your provider comparison and follow-up?", suggestedReplies: [] };
  if (!p.hasPhone) return { ...intelligence, stage: "CLOSING", nextAction: "ask_phone", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "Thank you. What is the best phone number for a ConnectIQ Internet Advisor to call you as soon as possible?", suggestedReplies: [] };
  if (!p.hasPreference) return { ...intelligence, stage: "CLOSING", nextAction: "ask_contact_preference", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "A ConnectIQ Internet Advisor will call you as soon as possible. May we also text or email you about your comparison if needed?", suggestedReplies: ["Yes, both work", "Text only", "Email only", "Phone only"] };
  if (!p.hasBestTime) return { ...intelligence, stage: "CLOSING", nextAction: "ask_best_contact_time", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: "Great. Is there a preferred time for the call—morning, afternoon, evening, or as soon as possible?", suggestedReplies: ["As soon as possible", "Morning", "Afternoon", "Evening"] };
  if (!p.hasPermission) return { ...intelligence, stage: "CLOSING", nextAction: "ask_followup_permission", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: `May a ConnectIQ Internet Advisor call ${p.facts.phone} to review these options and help you move forward?`, suggestedReplies: ["Yes, please call me", "No phone call"] };

  if (p.facts.followUpPermission === false || isDecline(text)) {
    return { ...intelligence, stage: "COMPLETED", nextAction: "complete_conversation", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: `Understood. ${summary(p, chosen, ranked, intent).replace(/A ConnectIQ Internet Advisor will call.*?next steps\./, "We will keep your information saved and follow up only through your permitted method.")}`, suggestedReplies: [] };
  }

  return { ...intelligence, stage: "ORDER_READY", nextAction: "close_conversation", selectedProvider: chosen?.provider || null, selectedProviderName: chosen?.name || null, message: summary(p, chosen, ranked, intent), suggestedReplies: ["Thank you", "I have one more question"] };
}
