import { updateCustomerMemory } from "../toolRouter/customerMemoryService.js";

function normalize(value = "") {
  return String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export function getProviderName(provider) {
  return provider?.displayName || provider?.brand_name || provider?.provider_name || provider?.name || null;
}

function providerTechnology(provider) {
  return provider?.technology || provider?.technologyType || provider?.technology_code_type || "broadband";
}

function providerMonthly(provider) {
  const value = provider?.price ?? provider?.monthlyPrice ?? provider?.estimatedMonthlyPrice;
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
}

function providerSpeed(provider) {
  const value = provider?.maxDownload ?? provider?.maxdown ?? provider?.downloadSpeed;
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
}

function allProviderNames(providers = []) {
  return providers.map(getProviderName).filter(Boolean);
}

function findMentionedProvider(message, providers = []) {
  const text = normalize(message);
  const known = [...allProviderNames(providers), "AT&T", "Spectrum", "Frontier", "EarthLink", "Verizon 5G Home", "Xfinity", "Cox", "Lumos", "T-Mobile"];
  return known.find((name) => text.includes(normalize(name))) || null;
}

function isCurrentProviderCorrection(message = "") {
  return /\b(actually|currently|right now|correction|i(?:'m| am) with|my provider is|i use|i have)\b/i.test(message);
}

function detectIntent(message = "") {
  const text = String(message).trim();
  if (/\b(don'?t want|do not want|not interested in|exclude|remove)\b/i.test(text)) return "reject_provider";
  if (isCurrentProviderCorrection(text) && /\b(with|provider|use|have)\b/i.test(text)) return "provider_correction";
  if (/\bhow much\b|\bprice\b|\bcost\b|\bmonthly\b|\bper month\b|\bpromotion\b/i.test(text)) return "pricing";
  if (/\bmobile\b|\bwireless\b|\bcell(?: phone)?\b|\bphone service\b/i.test(text)) return "mobile";
  if (/\bwhy\b.*\b(recommend(?:ed|ation)?|best|leading|choose|chosen)\b|\bwhy is it best\b/i.test(text)) return "explanation";
  if (/\b(show|compare|what are)\b.*\b(alternative|option|provider)s?\b|\bother options\b/i.test(text)) return "comparison";
  if (/\b(build|prepare|show|review|give me)\b.*\bquote\b|\bquote me\b/i.test(text)) return "quote";
  if (/\binstall(?:ation)?\b|\bhow long\b.*\b(setup|install)\b|\bschedule\b/i.test(text)) return "installation";
  if (/\b(human|person|representative|agent|call me)\b/i.test(text)) return "handoff";
  return "discovery";
}

function extractAdditionalFacts(message = "") {
  const facts = {};
  const needs = [];
  const pains = [];
  const preferences = [];
  const budget = message.match(/(?:under|below|less than|no more than|budget(?: is)?|spend(?:ing)?(?: over)?|maximum(?: of)?)\s*\$?\s*(\d{2,4})/i);
  if (budget) facts.budget = Number(budget[1]);
  const children = message.match(/(?:have|with)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:kids|children)/i);
  if (children) {
    const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    facts.children = Number(children[1]) || words[children[1].toLowerCase()];
  }
  if (/\bstream(?:ing)?\b|\bnetflix\b|\bhulu\b|\byoutube tv\b/i.test(message)) needs.push("streaming");
  if (/\bwork from home\b|\bremote work\b|\bzoom\b|\bteams calls?\b/i.test(message)) needs.push("workFromHome");
  if (/\bupstairs\b|\bdead zone\b|\bpoor wi-?fi\b|\bwi-?fi.*(?:awful|bad|weak)\b/i.test(message)) pains.push("wifiCoverage");
  if (/\blower(?:ing)? my bill\b|\bcheaper\b|\bsave money\b|\bbudget\b|\bunder \$?\d+/i.test(message)) preferences.push("price");
  return { facts, needs, pains, preferences };
}

function selectProvider(providers, memory, explicitProvider = null) {
  const current = normalize(memory.facts?.currentProvider);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  const candidates = providers.filter((provider) => {
    const name = normalize(getProviderName(provider));
    return name && name !== current && !rejected.has(name);
  });
  if (explicitProvider) {
    const exact = providers.find((provider) => normalize(getProviderName(provider)) === normalize(explicitProvider));
    if (exact && !rejected.has(normalize(explicitProvider))) return exact;
  }
  if (memory.selectedProvider) {
    const prior = candidates.find((provider) => normalize(getProviderName(provider)) === normalize(memory.selectedProvider));
    if (prior) return prior;
  }
  return candidates[0] || null;
}

function reasonsFor(provider, memory) {
  const reasons = [];
  const tech = providerTechnology(provider);
  const speed = providerSpeed(provider);
  const monthly = providerMonthly(provider);
  if (/fiber/i.test(tech)) reasons.push("fiber is generally a strong fit for work-from-home reliability and upload performance");
  else reasons.push(`${tech} is available at this address`);
  if ((memory.preferences || []).includes("price") || memory.facts?.budget) {
    if (monthly) reasons.push(`its known monthly estimate is $${monthly}`);
    else reasons.push("it remains an alternative worth pricing against your current bill");
  }
  if ((memory.householdNeeds || []).includes("streaming")) reasons.push("it can be evaluated for a household that streams heavily");
  if ((memory.householdNeeds || []).includes("workFromHome")) reasons.push("it can be evaluated for remote-work needs");
  if ((memory.painPoints || []).includes("wifiCoverage")) reasons.push("the final quote should include whole-home Wi-Fi or mesh equipment");
  if (speed) reasons.push(`the availability data reports speeds up to ${speed} Mbps`);
  return reasons.slice(0, 4);
}

function alternatives(providers, memory, selectedName) {
  const current = normalize(memory.facts?.currentProvider);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  return providers
    .filter((provider) => {
      const name = normalize(getProviderName(provider));
      return name && name !== current && name !== normalize(selectedName) && !rejected.has(name);
    })
    .slice(0, 3);
}

function createQuote(provider, memory) {
  if (!provider) return null;
  const monthly = providerMonthly(provider);
  const currentBill = Number(memory.facts?.monthlyBill || 0) || null;
  return {
    provider: getProviderName(provider),
    technology: providerTechnology(provider),
    downloadMbps: providerSpeed(provider),
    uploadMbps: Number(provider?.maxUpload || provider?.maxup || provider?.uploadSpeed || 0) || null,
    estimatedMonthlyPrice: monthly,
    estimatedMonthlySavings: monthly && currentBill ? Math.max(0, currentBill - monthly) : null,
    status: monthly ? "ESTIMATE_READY" : "PRICE_CONFIRMATION_REQUIRED",
    disclaimer: "Pricing, availability, taxes, equipment, promotions, and installation details must be confirmed before submission.",
  };
}

export function processConversationIntelligence({ sessionId, message, providers = [], memory = {} }) {
  const intent = detectIntent(message);
  const mentioned = findMentionedProvider(message, providers);
  const extra = extractAdditionalFacts(message);
  let patch = {
    facts: extra.facts,
    householdNeeds: extra.needs,
    painPoints: extra.pains,
    preferences: extra.preferences,
    activeIntent: intent,
    lastCustomerMessage: message,
  };

  if (intent === "provider_correction" && mentioned) {
    patch.facts = { ...patch.facts, currentProvider: mentioned };
    patch.selectedProvider = null;
  }

  if (intent === "reject_provider") {
    const target = mentioned || memory.selectedProvider;
    if (target) patch.rejectedProviders = [...new Set([...(memory.rejectedProviders || []), target])];
    patch.selectedProvider = null;
  }

  let nextMemory = updateCustomerMemory(sessionId, patch);
  const explicitForQuestion = ["pricing", "mobile", "explanation", "quote"].includes(intent) ? mentioned : null;
  const selected = selectProvider(providers, nextMemory, explicitForQuestion);
  const selectedName = getProviderName(selected);
  nextMemory = updateCustomerMemory(sessionId, {
    selectedProvider: selectedName,
    lastReferencedProvider: explicitForQuestion || selectedName || nextMemory.lastReferencedProvider || null,
  });

  const referencedName = mentioned || nextMemory.lastReferencedProvider || selectedName;
  const referencedProvider = providers.find((p) => normalize(getProviderName(p)) === normalize(referencedName)) || selected;
  const quote = createQuote(selected, nextMemory);
  const monthly = referencedProvider ? providerMonthly(referencedProvider) : null;
  const suggestions = [];
  let response;

  switch (intent) {
    case "provider_correction":
      response = mentioned
        ? `Thanks for correcting me. I have updated your current provider to ${mentioned}. I will exclude ${mentioned} from switch recommendations and compare the other providers available at your address.`
        : "Tell me the name of your current provider and I will update the comparison.";
      suggestions.push("Show alternatives", "How much is the leading option?", "Build my quote");
      break;
    case "reject_provider": {
      const rejected = mentioned || memory.selectedProvider;
      response = selectedName
        ? `Understood. I have removed ${rejected || "that provider"} from consideration. ${selectedName} is now the leading remaining option, and I can compare its pricing and service details next.`
        : `Understood. I have removed ${rejected || "that provider"} from consideration. There are no remaining verified alternatives in the current address results, so I can prepare a human review.`;
      suggestions.push("Why this option?", "Show alternatives", "Talk to an advisor");
      break;
    }
    case "pricing":
      if (!referencedProvider) response = "Which provider would you like pricing for?";
      else if (monthly) response = `${getProviderName(referencedProvider)} is currently estimated at about $${monthly} per month. Final pricing, promotions, equipment, taxes, and installation must still be confirmed.`;
      else response = `I do not have a verified monthly price for ${getProviderName(referencedProvider)} yet. I will not invent one. I can prepare a quote request for exact pricing or compare its availability and performance now.`;
      suggestions.push("Build my quote", "Show alternatives", "Why is it recommended?");
      break;
    case "mobile":
      response = referencedProvider
        ? `Mobile availability depends on the provider. I do not yet have verified mobile-bundle data for ${getProviderName(referencedProvider)} in this address result, so I would confirm it during the quote process rather than guess.`
        : "Some internet providers offer mobile bundles, but I need to confirm the selected provider before giving you a reliable answer.";
      suggestions.push("Build my quote", "Compare providers", "Ask about pricing");
      break;
    case "explanation": {
      if (!selected) response = "I need at least one eligible provider before I can explain a recommendation.";
      else {
        const reasons = reasonsFor(selected, nextMemory);
        response = `${selectedName} is currently recommended because ${reasons.join("; ")}. This is a fit recommendation based on the information available—not a final claim about exact price or promotions.`;
      }
      suggestions.push("Show alternatives", "How much is it?", "Build my quote");
      break;
    }
    case "comparison": {
      const other = alternatives(providers, nextMemory, selectedName).map(getProviderName);
      response = selectedName
        ? `${selectedName} is the current leading option. ${other.length ? `Other eligible alternatives are ${other.join(", ")}.` : "No other eligible alternatives remain after excluding your current and rejected providers."}`
        : "I do not have an eligible alternative to compare yet.";
      suggestions.push("Why is the leading option best?", "Compare monthly cost", "Build my quote");
      break;
    }
    case "quote":
      response = quote
        ? quote.estimatedMonthlyPrice
          ? `I prepared an estimate for ${quote.provider} at about $${quote.estimatedMonthlyPrice} per month. Final carrier confirmation is still required.`
          : `I selected ${quote.provider} for the quote. Exact monthly pricing still requires provider confirmation, but your needs and provider preference are now attached to the quote request.`
        : "I need an eligible provider before I can prepare the quote.";
      suggestions.push("Continue to order details", "Show alternatives", "Talk to an advisor");
      break;
    case "installation":
      response = referencedProvider
        ? `Installation timing for ${getProviderName(referencedProvider)} must be confirmed when the order is submitted. I can preserve your preferred date and include it in the order request.`
        : "Installation timing depends on the selected provider and address. Choose a provider and I will include your preferred date in the quote request.";
      suggestions.push("Build my quote", "Show alternatives", "Talk to an advisor");
      break;
    case "handoff":
      response = "I will preserve your address, provider options, preferences, and conversation for a ConnectIQ advisor. What phone number or email should they use?";
      suggestions.push("Call me", "Text me", "Email me");
      break;
    default: {
      const learned = [];
      if (extra.facts.budget) learned.push(`a budget below $${extra.facts.budget}`);
      if (extra.facts.children) learned.push(`${extra.facts.children} children in the household`);
      if (extra.needs.includes("streaming")) learned.push("heavy streaming");
      if (extra.needs.includes("workFromHome")) learned.push("work-from-home use");
      if (extra.pains.includes("wifiCoverage")) learned.push("poor upstairs Wi-Fi coverage");
      response = learned.length
        ? `I captured ${learned.join(", ")}. ${selectedName ? `${selectedName} remains the leading eligible option, but I will include whole-home Wi-Fi and your budget in the final comparison.` : "I will use those needs to rank the available providers."}`
        : selectedName
          ? `${selectedName} is the current leading eligible option. Ask me about its price, mobile bundles, installation, alternatives, or why it is recommended.`
          : "Tell me your current provider, monthly bill, budget, and what you want to improve.";
      suggestions.push("Why is it recommended?", "Show alternatives", "Build my quote");
    }
  }

  nextMemory = updateCustomerMemory(sessionId, {
    selectedProvider: selectedName,
    activeQuoteProvider: quote?.provider || null,
    lastAdvisorResponse: response,
  });

  return {
    intent,
    memory: nextMemory,
    selectedProvider: selected,
    advisor: { message: response, suggestedReplies: suggestions },
    quote,
  };
}
