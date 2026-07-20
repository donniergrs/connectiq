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
export function buildSalesCloserContext({ message, memory = {}, providers = [], quote = null, stage = "DISCOVERY" }) {
  return {
    channel: "web_chat_and_elevenlabs_voice",
    stage,
    latestCustomerMessage: String(message || ""),
    customerProfile: {
      address: memory.facts?.serviceAddress || null,
      currentProvider: memory.facts?.currentProvider || null,
      monthlyBill: memory.facts?.monthlyBill || null,
      needs: memory.householdNeeds || [],
      painPoints: memory.painPoints || [],
      preferences: memory.preferences || [],
      primaryGoal: memory.primaryGoal || null,
      rejectedProviders: memory.rejectedProviders || [],
      selectedProvider: memory.selectedProvider || null,
    },
    verifiedAddressOptions: providers.map(providerSummary),
    currentQuote: quote || null,
    recentConversation: (memory.recentTurns || []).slice(-12),
  };
}
