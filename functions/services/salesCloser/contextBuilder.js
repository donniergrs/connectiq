import { evaluateAdaptiveSalesStrategy } from "./adaptiveSalesStrategy.js";
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
function relationshipStage(facts = {}, quote = null) {
  if (!facts.customerName) return "INTRODUCE_AND_CAPTURE_NAME";
  if (!facts.email && quote?.provider) return "ASK_EMAIL_FOR_QUOTE";
  if (facts.email && !facts.phone && quote?.provider) return "ASK_PHONE_FOR_QUOTE_FOLLOW_UP";
  if (facts.email && facts.phone && !facts.contactPreference) return "ASK_CONTACT_PREFERENCE";
  return "CONTINUE_CONSULTATIVE_SALE";
}
export function buildSalesCloserContext({ message, memory = {}, providers = [], quote = null, stage = "DISCOVERY" }) {
  const facts = memory.facts || {};
  const adaptiveStrategy = evaluateAdaptiveSalesStrategy({ memory, message, quote });
  return {
    channel: "web_chat_and_elevenlabs_voice",
    advisorIdentity: { name: "David", role: "ConnectIQ Internet Advisor" },
    stage,
    relationshipStage: relationshipStage(facts, quote),
    adaptiveStrategy,
    latestCustomerMessage: String(message || ""),
    customerProfile: {
      name: facts.customerName || null,
      preferredName: facts.preferredName || facts.customerName || null,
      email: facts.email || null,
      phone: facts.phone || null,
      contactPreference: facts.contactPreference || null,
      bestContactTime: facts.bestContactTime || null,
      address: facts.serviceAddress || null,
      currentProvider: facts.currentProvider || null,
      monthlyBill: facts.monthlyBill || null,
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
