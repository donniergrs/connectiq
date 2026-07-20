function money(value) { return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(0)}` : ""; }
function providerName(provider) { return provider?.displayName || provider?.brand_name || provider?.name || null; }

export function buildAdvisorResponse({ routerResult = {}, providers = [], quote = null } = {}) {
  const memory = routerResult.memory || {};
  const facts = memory.facts || {};
  const pains = memory.painPoints || [];
  const needs = memory.householdNeeds || [];
  const preferences = memory.preferences || [];
  const action = routerResult.orchestration?.nextBestAction?.action || routerResult.response?.nextAction || "continue_discovery";
  const provider = providers[0] || null;

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
    const reason = pains.includes("reliability") || needs.includes("workFromHome")
      ? "its technology and performance profile best support dependable work, calls, and everyday use"
      : preferences.includes("price")
        ? "it provides the strongest balance of estimated monthly value and available performance"
        : "it provides the strongest overall fit from the options available at your address";
    return { message: `${providerName(provider)} is currently my leading recommendation because ${reason}.`, suggestedReplies: ["Why is it best?", "Show alternatives", "Build my quote"] };
  }

  return { message: `${acknowledgement}Tell me what you would like to improve about your current internet service.`, suggestedReplies: ["Lower my bill", "Improve reliability", "Get faster speed"] };
}

export function buildAdvisorQuote({ routerResult = {}, providers = [], selectedProvider = null } = {}) {
  const facts = routerResult.memory?.facts || {};
  const provider = selectedProvider || providers[0] || null;
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
