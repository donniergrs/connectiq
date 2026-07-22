function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(0)}` : "";
}

function providerName(provider) {
  return provider?.displayName || provider?.brand_name || provider?.name || null;
}

function normalizeProviderName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^att$/, "atandt")
    .replace(/^comcast$/, "xfinity")
    .replace(/^tmobile$/, "tmobile");
}

export function selectRecommendedProvider(providers = [], currentProvider = null) {
  if (!Array.isArray(providers) || providers.length === 0) return null;
  const current = normalizeProviderName(currentProvider);
  if (!current) return providers[0];

  // Never recommend the customer's existing provider as a switch when an
  // alternative is available. This prevents the advisor from repeatedly
  // presenting the same provider after a customer clarifies who they use.
  return providers.find((provider) => normalizeProviderName(providerName(provider)) !== current) || providers[0];
}

function recommendationReason({ provider, pains = [], needs = [], preferences = [] }) {
  const technology = provider?.technology || provider?.technologyType || provider?.technology_code_type || "service profile";
  if (preferences.includes("price") || pains.includes("price")) {
    return `it appears to offer the strongest alternative value while still using ${technology}`;
  }
  if (pains.includes("reliability") || needs.includes("workFromHome")) {
    return `its ${technology} option is the strongest alternative for dependable work, calls, and everyday use`;
  }
  if (preferences.includes("speed") || pains.includes("speed")) {
    return `its ${technology} option provides the strongest available performance alternative`;
  }
  if (preferences.includes("wifiCoverage") || pains.includes("wifiCoverage")) {
    return `its ${technology} option is the best alternative starting point for improving whole-home connectivity`;
  }
  return "it provides the strongest overall alternative fit from the options available at your address";
}

function alternativeNames(providers = [], currentProvider = null, limit = 3) {
  const current = normalizeProviderName(currentProvider);
  return providers
    .filter((provider) => normalizeProviderName(providerName(provider)) !== current)
    .map(providerName)
    .filter(Boolean)
    .slice(0, limit);
}

export function buildAdvisorResponse({ routerResult = {}, providers = [], quote = null } = {}) {
  const memory = routerResult.memory || {};
  const facts = memory.facts || {};
  const pains = memory.painPoints || [];
  const needs = memory.householdNeeds || [];
  const preferences = memory.preferences || [];
  const action = routerResult.orchestration?.nextBestAction?.action || routerResult.response?.nextAction || "continue_discovery";
  const latestMessage = String(routerResult.message || "").trim();
  const provider = selectRecommendedProvider(providers, facts.currentProvider);
  const providerLabel = providerName(provider);
  const currentMatchesFirst = providers.length > 0 && normalizeProviderName(providerName(providers[0])) === normalizeProviderName(facts.currentProvider);

  // Brain V2 owns conversational decisions when present. Legacy action-based
  // responses remain as a fallback for older callers and staged migrations.
  if (routerResult.brainV2?.response?.answer) {
    return {
      message: routerResult.brainV2.response.answer,
      suggestedReplies: routerResult.brainV2.response.followUp
        ? [routerResult.brainV2.response.followUp]
        : [],
      selectedSkill: routerResult.brainV2.selectedSkill,
    };
  }

  const known = [];
  if (facts.currentProvider) known.push(`you currently use ${facts.currentProvider}`);
  if (facts.monthlyBill) known.push(`you pay about ${money(facts.monthlyBill)} per month`);
  const acknowledgement = known.length ? `I understand that ${known.join(" and ")}. ` : "";

  const responses = {
    human_handoff: { message: "I’ll preserve everything you’ve shared and prepare this conversation for a ConnectIQ advisor. What is the best phone number or email for the follow-up?", suggestedReplies: ["Call me", "Text me", "Email me"] },
    prepare_order: { message: "You’re ready to move forward. I’ll verify the selected provider, service address, pricing, installation details, and contact information before preparing the order.", suggestedReplies: ["Review my quote", "Use this provider", "Talk to an advisor"] },
    resolve_objection: { message: "That is a fair concern. I’ll compare the complete value—monthly cost, speed, reliability, equipment, and installation—before asking you to choose.", suggestedReplies: ["Show best value", "Compare reliability", "Show total cost"] },
    ask_current_provider: { message: `${acknowledgement}Who is your current internet provider?`, suggestedReplies: ["Spectrum", "AT&T", "Xfinity"] },
    ask_monthly_bill: { message: `${acknowledgement}About how much do you pay each month?`, suggestedReplies: ["$75 a month", "$100 a month", "$125 a month"] },
    ask_priority: { message: `${acknowledgement}What matters most to you: a lower price, better reliability, faster speed, or stronger Wi-Fi coverage?`, suggestedReplies: ["Lowest price", "Reliability", "Fastest speed"] },
    ask_address: { message: `${acknowledgement}I have enough information to personalize the comparison. Enter your full service address so I can check which providers are actually available.`, suggestedReplies: [] },
    check_availability: { message: `${acknowledgement}Your priorities are clear${preferences.length ? `—especially ${preferences.join(", ")}` : ""}. Enter your service address and I’ll check address-level availability.`, suggestedReplies: [] },
  };
  if (responses[action]) return responses[action];

  if (action === "present_recommendation" && provider) {
    const reason = recommendationReason({ provider, pains, needs, preferences });
    const alternatives = alternativeNames(providers, facts.currentProvider);

    if (/\bwhy\b.*\b(best|recommend|leading)\b|\bwhy is it best\b/i.test(latestMessage)) {
      return {
        message: `${providerLabel} leads because ${reason}. I am also excluding ${facts.currentProvider || "your current provider"} from the switch recommendation so the comparison focuses on genuine alternatives.`,
        suggestedReplies: ["Show alternatives", "Compare monthly cost", "Build my quote"],
      };
    }

    if (/\b(show|compare)\b.*\b(alternative|option|provider)s?\b/i.test(latestMessage)) {
      return {
        message: alternatives.length
          ? `The strongest alternatives to ${facts.currentProvider || "your current provider"} are ${alternatives.join(", ")}. I currently rank ${providerLabel} first based on what you told me matters most.`
          : `I do not yet have another verified provider option at this address. I can still help compare plans or prepare a human review.`,
        suggestedReplies: ["Why is the first one best?", "Compare reliability", "Talk to an advisor"],
      };
    }

    if (/\b(build|show|review)\b.*\bquote\b/i.test(latestMessage)) {
      return {
        message: quote?.estimatedMonthlyPrice
          ? `I built an estimate for ${providerLabel} at about ${money(quote.estimatedMonthlyPrice)} per month. Final pricing, equipment, taxes, promotions, and installation still need confirmation.`
          : `I have selected ${providerLabel} for the quote, but the provider's confirmed monthly price is still required before I can calculate exact savings.`,
        suggestedReplies: ["Continue to order details", "Show alternatives", "Talk to an advisor"],
      };
    }

    const clarification = currentMatchesFirst && facts.currentProvider
      ? `Thanks for clarifying that you already have ${facts.currentProvider}. I will not recommend switching you to the same provider. `
      : "";

    return {
      message: `${clarification}${providerLabel} is now my leading alternative because ${reason}.`,
      suggestedReplies: ["Why is it best?", "Show alternatives", "Build my quote"],
    };
  }

  return { message: `${acknowledgement}Tell me what you would like to improve about your current internet service.`, suggestedReplies: ["Lower my bill", "Improve reliability", "Get faster speed"] };
}

export function buildAdvisorQuote({ routerResult = {}, providers = [], selectedProvider = null } = {}) {
  const facts = routerResult.memory?.facts || {};
  const provider = selectedProvider || selectRecommendedProvider(providers, facts.currentProvider);
  const monthly = Number(provider?.price || provider?.monthlyPrice || provider?.estimatedMonthlyPrice || 0) || null;
  const current = Number(facts.monthlyBill || 0) || null;
  return {
    provider: providerName(provider),
    technology: provider?.technology || provider?.technologyType || provider?.technology_code_type || null,
    downloadMbps: Number(provider?.maxDownload || provider?.maxdown || provider?.downloadSpeed || 0) || null,
    uploadMbps: Number(provider?.maxUpload || provider?.maxup || provider?.uploadSpeed || 0) || null,
    estimatedMonthlyPrice: monthly,
    estimatedMonthlySavings: monthly && current ? Math.max(0, current - monthly) : null,
    status: provider ? "ESTIMATE_READY" : "NEEDS_PROVIDER",
    disclaimer: "Pricing, availability, taxes, equipment, promotions, and installation details must be confirmed before submission.",
  };
}
