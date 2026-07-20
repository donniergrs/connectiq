function includesAny(values = [], options = []) { return options.some(v => values.includes(v)); }

export function decideNextBestAction({ memory = {}, intent = {}, threads = [], providers = [] } = {}) {
  const facts = memory.facts || {};
  const pains = memory.painPoints || [];
  const needs = memory.householdNeeds || [];
  const preferences = memory.preferences || [];
  const textIntent = intent.primary || "discovery";

  if (memory.handoffRequested || threads.some(t => t.topic === "human_handoff" && t.status !== "resolved")) {
    return { action: "human_handoff", reason: "Customer requested a person.", confidence: 0.99 };
  }
  if (textIntent === "orderReadiness") return { action: "prepare_order", reason: "Customer expressed purchase intent.", confidence: 0.96 };
  if (textIntent === "objection") return { action: "resolve_objection", reason: "An objection or concern needs resolution.", confidence: 0.92 };
  if (!facts.currentProvider) return { action: "ask_current_provider", reason: "Current provider is unknown.", confidence: 0.95 };
  if (!facts.monthlyBill) return { action: "ask_monthly_bill", reason: "Current monthly cost is unknown.", confidence: 0.95 };
  if (!preferences.length && !pains.length && !needs.length) return { action: "ask_priority", reason: "Primary buying priority is unknown.", confidence: 0.93 };
  if (!facts.serviceAddress && providers.length === 0) return { action: "ask_address", reason: "Address is required for availability.", confidence: 0.96 };
  if (providers.length > 0) return { action: "present_recommendation", reason: "Availability and customer needs are sufficient for comparison.", confidence: 0.9 };
  if (includesAny(preferences, ["price","reliability","speed","wifiCoverage"]) || pains.length || needs.length) {
    return { action: "check_availability", reason: "Discovery is sufficient to check address-level availability.", confidence: 0.86 };
  }
  return { action: "continue_discovery", reason: "More customer context will improve the recommendation.", confidence: 0.7 };
}
