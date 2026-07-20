export function decideNextAction({ memory = {}, topics = [], providers = [], stage = "DISCOVERY" } = {}) {
  const facts = memory.facts || {};
  const preferences = new Set([...(memory.painPoints || []), ...(memory.householdNeeds || []), ...(memory.preferences || [])]);
  if (topics.includes("handoff")) return { action: "HUMAN_HANDOFF", reason: "Customer requested a person.", requiredField: null };
  if (!facts.currentProvider) return { action: "ASK_CURRENT_PROVIDER", reason: "Current provider is unknown.", requiredField: "currentProvider" };
  if (!facts.monthlyBill) return { action: "ASK_MONTHLY_BILL", reason: "Current monthly bill is unknown.", requiredField: "monthlyBill" };
  if (!preferences.size) return { action: "ASK_PRIORITY", reason: "Primary buying priority is unknown.", requiredField: "priority" };
  if (!providers.length) return { action: "ASK_ADDRESS_LOOKUP", reason: "Provider availability has not been confirmed.", requiredField: "address" };
  if (topics.includes("order") || stage === "ORDER") return { action: "PREPARE_ORDER", reason: "Customer expressed purchase intent.", requiredField: null };
  return { action: "PRESENT_RECOMMENDATION", reason: "Enough information exists to compare providers.", requiredField: null };
}
