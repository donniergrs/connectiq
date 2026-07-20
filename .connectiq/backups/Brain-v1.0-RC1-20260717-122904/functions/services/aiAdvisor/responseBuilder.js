function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(0)}` : "";
}

export function buildAdvisorResponse({ routerResult = {}, providers = [], quote = null } = {}) {
  const memory = routerResult.memory || {};
  const facts = memory.facts || {};
  const pains = memory.painPoints || [];
  const needs = memory.householdNeeds || [];
  const primary = routerResult.intent?.primary || "discovery";
  const provider = providers[0] || null;

  if (primary === "objection") {
    return {
      message: "That is a fair concern. I’ll compare the full value—including reliability, speed, equipment, and estimated monthly cost—before asking you to choose.",
      suggestedReplies: ["Show me the best value", "Compare reliability", "What will it cost?"],
    };
  }

  if (provider && (primary === "recommendation" || routerResult.toolsInvoked?.includes("recommendation"))) {
    const reason = pains.includes("reliability") || needs.includes("workFromHome")
      ? "its connection type and performance profile are a strong fit for reliable work and video calls"
      : "it provides the strongest overall fit from the options available at your address";
    return {
      message: `${provider.displayName || provider.name || "This provider"} is currently my leading recommendation because ${reason}. I’ll keep comparing price and speed before we finalize it.`,
      suggestedReplies: ["Why is it best?", "Show alternatives", "Build my quote"],
    };
  }

  const known = [];
  if (facts.currentProvider) known.push(`you currently use ${facts.currentProvider}`);
  if (facts.monthlyBill) known.push(`you pay about ${money(facts.monthlyBill)} per month`);
  const acknowledgement = known.length ? `I understand that ${known.join(" and ")}. ` : "";
  const next = !facts.currentProvider
    ? "Who is your current internet provider?"
    : !facts.monthlyBill
      ? "About how much do you pay each month?"
      : !needs.length
        ? "What matters most: reliability, price, speed, gaming, streaming, or working from home?"
        : "I have enough information to begin comparing the available providers. Would you like my best recommendation?";
  return {
    message: `${acknowledgement}${next}`,
    suggestedReplies: facts.currentProvider && facts.monthlyBill
      ? ["Reliability", "Lowest price", "Fastest speed"]
      : [],
  };
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
