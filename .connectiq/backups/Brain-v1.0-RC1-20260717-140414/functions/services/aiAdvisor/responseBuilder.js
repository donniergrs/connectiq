function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(0)}` : "";
}

export function buildAdvisorResponse({ routerResult = {}, providers = [], quote = null } = {}) {
  const memory = routerResult.memory || {};
  const facts = memory.facts || {};
  const pains = memory.painPoints || [];
  const needs = memory.householdNeeds || [];
  const preferences = memory.preferences || [];
  const decision = routerResult.orchestration?.decision || {};
  const action = decision.action || routerResult.response?.nextAction || "ASK_CURRENT_PROVIDER";
  const provider = providers[0] || null;

  const known = [];
  if (facts.currentProvider) known.push(`you currently use ${facts.currentProvider}`);
  if (facts.monthlyBill) known.push(`you pay about ${money(facts.monthlyBill)} per month`);
  const acknowledgement = known.length ? `I understand that ${known.join(" and ")}. ` : "";

  if (action === "HUMAN_HANDOFF") return { message: "Absolutely. I’ll preserve everything you have shared and prepare this conversation for a ConnectIQ representative.", suggestedReplies: ["Request a callback", "Keep chatting"] };
  if (action === "ASK_CURRENT_PROVIDER") return { message: `${acknowledgement}Who is your current internet provider?`, suggestedReplies: ["Spectrum", "AT&T", "Xfinity", "Other"] };
  if (action === "ASK_MONTHLY_BILL") return { message: `${acknowledgement}About how much do you pay each month?`, suggestedReplies: ["Under $75", "$75–$100", "$100–$150", "Over $150"] };
  if (action === "ASK_PRIORITY") return { message: `${acknowledgement}What matters most to you: a lower price, better reliability, faster speeds, or stronger Wi-Fi coverage?`, suggestedReplies: ["Lowest price", "Best reliability", "Fastest speed", "Better Wi-Fi"] };
  if (action === "ASK_ADDRESS_LOOKUP") return { message: `${acknowledgement}I understand your priorities. Enter your service address so I can compare the providers actually available there.`, suggestedReplies: [] };
  if (action === "PREPARE_ORDER") return { message: `${provider ? provider.displayName || provider.brand_name || provider.name : "The leading option"} is ready for the next step. I’ll preserve your preferences and begin collecting the required order details.`, suggestedReplies: ["Continue to order", "Review recommendation", "Talk to a person"] };

  if (provider) {
    const priorities = [...new Set([...pains, ...needs, ...preferences])];
    const reason = priorities.includes("price") ? "it provides the strongest value for your price priority" : priorities.includes("reliability") || priorities.includes("workFromHome") ? "its connection and performance profile fit your reliability needs" : priorities.includes("speed") ? "its available speed is the strongest match for your usage" : "it provides the strongest overall fit from the options available";
    return { message: `${provider.displayName || provider.brand_name || provider.name || "This provider"} is my leading recommendation because ${reason}.`, suggestedReplies: ["Why is it best?", "Show alternatives", "Build my quote", "Start my order"] };
  }
  return { message: `${acknowledgement}I’m ready to continue comparing your options.`, suggestedReplies: ["Continue"] };
}

export function buildAdvisorQuote({ routerResult = {}, providers = [], selectedProvider = null } = {}) {
  const memory = routerResult.memory || {};
  const facts = memory.facts || {};
  const provider = selectedProvider || providers[0] || null;
  const monthly = Number(provider?.price || provider?.monthlyPrice || provider?.estimatedMonthlyPrice || 0) || null;
  const current = Number(facts.monthlyBill || 0) || null;
  return {
    provider: provider?.displayName || provider?.brand_name || provider?.name || null,
    technology: provider?.technology || provider?.technologyType || provider?.technology_code_type || null,
    downloadMbps: Number(provider?.maxDownload || provider?.maxdown || provider?.downloadSpeed || 0) || null,
    uploadMbps: Number(provider?.maxUpload || provider?.maxup || provider?.uploadSpeed || 0) || null,
    estimatedMonthlyPrice: monthly,
    estimatedMonthlySavings: monthly && current ? Math.max(0, current - monthly) : null,
    status: provider ? "ESTIMATE_READY" : "NEEDS_PROVIDER",
    disclaimer: "Pricing and installation details must be confirmed with the provider before submission.",
  };
}
