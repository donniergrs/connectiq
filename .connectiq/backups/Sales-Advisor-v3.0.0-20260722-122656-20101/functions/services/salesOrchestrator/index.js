const normalize = (value = "") => String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

export function providerName(provider = {}) {
  return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "Provider";
}

function technology(provider = {}) {
  return String(provider.technology || provider.technologyType || provider.technology_code_type || "Broadband");
}

function includesAny(value, terms) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(term));
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
  let score = includesAny(tech, ["fiber", "fttp"]) ? 100 : includesAny(tech, ["cable", "docsis"]) ? 76 : includesAny(tech, ["fixed", "5g"]) ? 52 : tech.includes("dsl") ? 32 : tech.includes("satellite") ? 12 : 48;
  if ((priorities.has("reliability") || needs.has("workFromHome")) && includesAny(tech, ["fiber", "fttp"])) score += 22;
  if ((priorities.has("speed") || needs.has("gaming") || needs.has("streaming")) && includesAny(tech, ["fiber", "fttp", "cable"])) score += 13;
  if (priorities.has("wifiCoverage") && provider.meshWifi) score += 8;
  const price = Number(provider.price || provider.monthlyPrice || provider.estimatedMonthlyPrice || 0);
  if (priorities.has("price") && price > 0) score += price <= 60 ? 16 : price <= 80 ? 9 : 0;
  if (facts.issueType === "wifi_only" && provider.meshWifi) score += 10;
  return score;
}

export function rankProviders(providers = [], memory = {}) {
  const current = normalize(memory.facts?.currentProvider);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  const eligible = providers.filter((provider) => {
    const name = normalize(providerName(provider));
    return name && name !== current && !rejected.has(name);
  });
  return eligible.map((provider) => {
    const fit = fitScore(provider, memory);
    const business = businessScore(provider);
    return { provider, name: providerName(provider), fit, business, score: Math.round((business * 0.6 + fit * 0.4) * 10) / 10 };
  }).sort((a, b) => b.score - a.score || b.fit - a.fit);
}

function profile(memory = {}) {
  const facts = memory.facts || {};
  const priorities = new Set([...(memory.preferences || []), ...(memory.painPoints || [])]);
  const needs = new Set(memory.householdNeeds || []);
  return {
    facts,
    priorities,
    needs,
    hasProvider: Boolean(facts.currentProvider),
    hasName: Boolean(facts.customerName || facts.preferredName),
    hasBill: Number(facts.monthlyBill) > 0,
    hasMotivation: priorities.size > 0,
    hasIssueDetail: Boolean(facts.issueType || facts.problemDescription),
    hasFrequency: Boolean(facts.issueFrequency),
    hasImpact: Boolean(facts.businessImpact || facts.usageImpact),
    hasTradeoff: Boolean(facts.decisionPriority),
    hasTroubleshooting: typeof facts.contactedProvider === "boolean" || Boolean(facts.troubleshootingStatus),
    hasSwitchIntent: Boolean(facts.switchIntent || facts.buyingTimeline),
  };
}

function is(text, regex) { return regex.test(String(text || "").toLowerCase()); }

function discoveryQuestion(p) {
  const provider = p.facts.currentProvider || "your current provider";
  if (!p.hasProvider) return { action: "ask_current_provider", message: "Who is your current internet provider today?", replies: ["Spectrum", "AT&T", "Xfinity"] };
  if (!p.hasName) return { action: "ask_name", message: `Thanks. I see you currently have ${provider}. Who do I have the pleasure of speaking with?`, replies: [] };
  if (!p.hasMotivation) return { action: "ask_primary_motivation", message: `Thanks, ${p.facts.preferredName || p.facts.customerName}. Before I recommend another provider, what made you start looking beyond ${provider}—a high bill, reliability problems, slow speeds, Wi-Fi coverage, or something else?`, replies: ["My bill is too high", "Reliability problems", "Slow speeds"] };
  if (p.priorities.has("reliability") && !p.hasIssueDetail) return { action: "ask_issue_type", message: `I want to understand the reliability problem before recommending a switch. Is the entire connection going down, or is it mainly Wi-Fi drops, buffering, or weak coverage inside the home?`, replies: ["The whole internet goes out", "Mostly Wi-Fi drops", "Buffering and slowdowns"] };
  if ((p.priorities.has("reliability") || p.priorities.has("speed") || p.priorities.has("wifiCoverage")) && !p.hasFrequency) return { action: "ask_issue_frequency", message: "How often is this happening, and is there a particular time of day when it is worst?", replies: ["A few times a week", "Every day", "Mostly evenings"] };
  if (!p.hasBill) return { action: "ask_monthly_bill", message: `About how much are you paying ${provider} each month, including equipment and add-on fees?`, replies: ["$75 a month", "$100 a month", "$125 a month"] };
  if (!p.hasImpact) return { action: "ask_customer_impact", message: "How do you use the connection most—working from home, streaming, gaming, schoolwork, or general browsing—and what is being affected today?", replies: ["Work from home", "Streaming and browsing", "Gaming"] };
  if (!p.hasTradeoff) return { action: "ask_decision_priority", message: "If the best alternative costs about the same as you pay now but is a better fit, would you prioritize reliability—or does the new service also need to lower your bill?", replies: ["Reliability matters most", "It also needs to be cheaper", "Balance both"] };
  if (!p.hasSwitchIntent) return { action: "ask_switch_intent", message: "Assuming we find a stronger option and confirm the total price, how soon would you want to switch?", replies: ["As soon as possible", "Within 30 days", "Just comparing for now"] };
  return null;
}

function explanation(top, p) {
  const reasons = [];
  const tech = technology(top.provider);
  if (p.priorities.has("reliability")) reasons.push(`your main concern is reliability and ${tech} is the strongest technology match in the remaining options`);
  if (p.needs.has("workFromHome") || p.facts.businessImpact) reasons.push("your connection affects work calls and remote access, so stability matters more than headline speed alone");
  if (p.priorities.has("price") || p.facts.decisionPriority === "price") reasons.push("we can compare its verified total cost against what you pay today before you commit");
  if (p.needs.has("streaming")) reasons.push("it should also support your streaming usage without making that the only deciding factor");
  return reasons.slice(0, 3).join("; ") || "it is the strongest eligible alternative after excluding your current and rejected providers";
}

function objectionType(text) {
  if (is(text, /don.?t want|do not want|exclude|remove|not interested|anything but/)) return "alternative";
  if (is(text, /how much|price|cost|monthly|fees?|expensive/)) return "price";
  if (is(text, /reliable|reliability|outage|goes out|uptime/)) return "reliability";
  if (is(text, /bad things|heard bad|don.?t trust|terrible|awful|hate/)) return "trust";
  if (is(text, /contract|cancel|early termination/)) return "contract";
  if (is(text, /install|installation|technician|how long/)) return "installation";
  if (is(text, /mobile|wireless|cell phone|bundle/)) return "bundle";
  return null;
}

function objectionResponse(type, top, ranked, p) {
  if (!top) return "I will keep that provider excluded and preserve your requirements for a manual availability review.";
  if (type === "alternative") {
    const names = ranked.slice(0, 3).map((item) => item.name);
    return names.length ? `Understood—I will keep that provider excluded for the rest of this conversation. The strongest remaining options are ${names.join(", ")}. Let me compare the first two against the reliability and cost requirements you gave me.` : "Understood—I will keep that provider excluded. I do not currently have another eligible option in the address results, so this needs a manual serviceability review.";
  }
  if (type === "price") return `I do not have a verified address-specific price for ${top.name} yet, so I will not invent one. I can prepare the quote request using your current $${p.facts.monthlyBill || "—"} bill as the benchmark, then ConnectIQ will confirm the exact plan, promotion, equipment, taxes, and installation charges before you approve anything.`;
  if (type === "reliability") return `${top.name} is leading because ${explanation(top, p)}. I still want the exact service type and address-level availability confirmed before presenting it as final.`;
  if (type === "trust") return `That concern is reasonable. I would not ask you to switch based on a provider name alone. We will compare the exact technology, total cost, installation terms, and service details at your address before you decide.`;
  if (type === "contract") return "We will verify both your current cancellation obligation and the new provider's contract terms before anything is submitted.";
  if (type === "installation") return "We will confirm whether a technician is required, the first available appointment, and every installation charge before you approve the order.";
  if (type === "bundle") return "I can include mobile bundle savings as a secondary comparison, but I will keep the internet recommendation centered on the reliability and usage needs you gave me.";
  return null;
}

function recommendation(top, p) {
  return `Based on what you told me, ${top.name} is the strongest alternative to investigate first. ${explanation(top, p)}. I have excluded ${p.facts.currentProvider} and every provider you rejected. This is a recommendation to verify and quote—not a claim that final serviceability or pricing is already confirmed.`;
}

function optionsMessage(ranked = [], p = {}) {
  const options = ranked.slice(0, 3);
  if (!options.length) return "I do not have an eligible alternative in the current results, so a ConnectIQ advisor needs to complete a manual serviceability review.";
  const summary = options.map((item, index) => `${index + 1}. ${item.name} (${technology(item.provider)})`).join("; ");
  return `Based on what you told me, the strongest options to verify are ${summary}. I excluded ${p.facts.currentProvider || "your current provider"} and any provider you rejected. A ConnectIQ advisor will confirm exact availability, plans, and pricing before you decide.`;
}
function isSimpleAcceptance(text = "") {
  return is(text, /^(?:ok|okay|yes|yeah|yep|sure|that works|sounds good|go ahead|continue|please do)[.! ]*$/);
}

export function orchestrateSalesResponse({ message = "", memory = {}, providers = [], quote = null } = {}) {
  const p = profile(memory);
  const ranked = rankProviders(providers, memory);
  const top = ranked[0] || null;
  const text = String(message || "").trim();
  const objection = objectionType(text);

  if (is(text, /^(?:no|nope|no thanks|not now|not at this time|nothing else|that(?:\'s| is) all|i(?:\'m| am) good|all set|thank you|thanks|stop|done)[.! ]*$/)) return { stage: "COMPLETED", nextAction: "complete_conversation", selectedProvider: top?.provider || null, selectedProviderName: top?.name || null, message: "No problem. I have preserved your needs and exclusions so you can return without starting over.", suggestedReplies: [] };

  const contactComplete = Boolean(p.facts.email && p.facts.phone && p.facts.contactPreference);
  const contactPreferenceAnswer = memory.lastNextAction === "ask_contact_preference" && contactComplete;
  if (contactPreferenceAnswer) return { stage: "ORDER_READY", nextAction: "create_quote_and_handoff", selectedProvider: top?.provider || null, selectedProviderName: top?.name || null, message: `Perfect. I have your information and requirements saved. A ConnectIQ advisor will review the available options and call you as soon as possible. We can also follow up by ${p.facts.contactPreference === "any" ? "text or email" : p.facts.contactPreference}. Is there anything else you want highlighted before I close the chat?`, suggestedReplies: ["No, that is all", "I have one more question"] };

  const acceptedOptions = memory.lastNextAction === "present_options_and_ask_email" && isSimpleAcceptance(text);
  if (acceptedOptions && !p.facts.email) return { stage: "CLOSING", nextAction: "ask_email", selectedProvider: top?.provider || null, selectedProviderName: top?.name || null, message: "Great. What is the best email address for your quote summary and follow-up?", suggestedReplies: [] };

  if (objection) return { stage: "OBJECTION", nextAction: objection === "alternative" ? "present_alternative" : "resolve_objection", selectedProvider: top?.provider || null, selectedProviderName: top?.name || null, message: objectionResponse(objection, top, ranked, p), suggestedReplies: objection === "alternative" ? ["Compare the first two", "Which is most reliable?"] : ["Compare alternatives", "Prepare my quote", "Continue"] };

  const question = discoveryQuestion(p);
  const explicitlyRequestsRecommendation = is(text, /what do you suggest|what.*recommend|best option|which.*choose|what should i do|compare the first two|which is most reliable|why did you pick|why.*recommend|^why\s+[a-z]/);
  if (question) {
    // Answer a direct provider question without abandoning discovery. The next missing
    // discovery question is appended once, so the customer is never ignored or looped.
    if (explicitlyRequestsRecommendation && top) {
      return {
        stage: "DISCOVERY",
        nextAction: question.action,
        selectedProvider: top.provider,
        selectedProviderName: top.name,
        message: `${top.name} is currently leading because ${explanation(top, p)}. That is not a final quote or serviceability confirmation. I still need one more detail so I do not steer you to the wrong provider. ${question.message}`,
        suggestedReplies: question.replies,
      };
    }
    return { stage: "DISCOVERY", nextAction: question.action, selectedProvider: null, message: question.message, suggestedReplies: question.replies };
  }

  if (!top) return { stage: "RECOMMENDATION", nextAction: "manual_review", selectedProvider: null, message: "I understand what you need, but I do not have an eligible alternative left in the current provider results. I will preserve your profile for a manual serviceability review.", suggestedReplies: ["Have an advisor contact me"] };

  if (explicitlyRequestsRecommendation || is(text, /why.*best|why.*recommend|explain/)) return { stage: "RECOMMENDATION", nextAction: "present_recommendation", selectedProvider: top.provider, selectedProviderName: top.name, message: recommendation(top, p), suggestedReplies: ["Show the next alternative", "Prepare my quote", "How much will it cost?"] };

  if (is(text, /next order|move forward|proceed|prepare.*quote|send.*quote|ready|sign me up|continue/)) {
    if (!p.facts.email) return { stage: "CLOSING", nextAction: "ask_email", selectedProvider: top.provider, selectedProviderName: top.name, message: `Great. I will prepare the ${top.name} quote request using the needs we discussed. What is the best email address to send the quote summary to?`, suggestedReplies: [] };
    if (!p.facts.phone) return { stage: "CLOSING", nextAction: "ask_phone", selectedProvider: top.provider, selectedProviderName: top.name, message: `Thank you. What is the best phone number for a ConnectIQ advisor to use if the provider needs clarification or the quote is ready to review?`, suggestedReplies: [] };
    if (!p.facts.contactPreference) return { stage: "CLOSING", nextAction: "ask_contact_preference", selectedProvider: top.provider, selectedProviderName: top.name, message: "Would you prefer the follow-up by text, email, or phone call?", suggestedReplies: ["Text", "Email", "Phone call"] };
    return { stage: "ORDER_READY", nextAction: "create_quote_and_handoff", selectedProvider: top.provider, selectedProviderName: top.name, message: `Perfect. I have enough to prepare the ${top.name} quote request and have ConnectIQ contact you by ${p.facts.contactPreference}. We will verify the exact plan, total monthly price, equipment, installation, and serviceability before anything is submitted.`, suggestedReplies: ["Review my quote", "I have one more question"] };
  }

  if (!p.facts.email) return { stage: "RECOMMENDATION", nextAction: "present_options_and_ask_email", selectedProvider: top.provider, selectedProviderName: top.name, message: `${optionsMessage(ranked, p)} What is the best email address for the quote summary? After that, I will get the best phone number so a ConnectIQ advisor can call you as soon as possible.`, suggestedReplies: [] };
  if (!p.facts.phone) return { stage: "CLOSING", nextAction: "ask_phone", selectedProvider: top.provider, selectedProviderName: top.name, message: "Thank you. What is the best phone number for a ConnectIQ advisor to call you as soon as possible?", suggestedReplies: [] };
  if (!p.facts.contactPreference) return { stage: "CLOSING", nextAction: "ask_contact_preference", selectedProvider: top.provider, selectedProviderName: top.name, message: "A phone call will be the primary follow-up. May we also contact you by text or email if needed?", suggestedReplies: ["Yes, either is fine", "Text is fine", "Email only"] };
  return { stage: "ORDER_READY", nextAction: "create_quote_and_handoff", selectedProvider: top.provider, selectedProviderName: top.name, message: `Perfect. Your information and requirements are saved. A ConnectIQ advisor will call you as soon as possible to verify the best option, exact pricing, and next steps.`, suggestedReplies: ["I have one more question", "No, that is all"] };
}
