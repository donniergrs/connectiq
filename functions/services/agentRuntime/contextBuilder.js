function providerName(provider = {}) {
  return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "Unknown provider";
}

function providerSummary(provider = {}) {
  return {
    name: providerName(provider),
    technology: provider.technology || provider.technologyType || provider.technology_code_type || "unknown",
    maxDownMbps: provider.maxdown || provider.maxDownloadMbps || provider.maxDown || null,
    maxUpMbps: provider.maxup || provider.maxUploadMbps || provider.maxUp || null,
    lowLatency: provider.lowlatency ?? provider.lowLatency ?? null,
    monthlyPrice: provider.price || provider.monthlyPrice || provider.estimatedMonthlyPrice || null,
    verified: provider.verified ?? provider.isVerified ?? true,
  };
}

export function buildAgentContext({ message, memory = {}, providers = [], quote = null, intent = {}, plan = {} }) {
  return {
    customerMessage: String(message || ""),
    customer: {
      facts: memory.facts || {},
      needs: memory.householdNeeds || [],
      painPoints: memory.painPoints || [],
      preferences: memory.preferences || [],
      rejectedProviders: memory.rejectedProviders || [],
      selectedProvider: memory.selectedProvider || null,
      primaryGoal: memory.primaryGoal || null,
    },
    availableProviders: providers.map(providerSummary),
    currentQuote: quote || null,
    detectedIntent: intent,
    plannedAction: plan,
    recentConversation: (memory.recentTurns || []).slice(-8),
  };
}
