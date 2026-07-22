function normalize(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}
function providerName(provider = {}) {
  return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "the recommended provider";
}
function recoveryMessage({ routerResult = {}, latestMessage = "", previousAdvisorMessage = "", quote = null, providers = [] } = {}) {
  const memory = routerResult?.memory || {};
  const facts = memory.facts || {};
  const selected = quote?.provider || memory.selectedProvider || providerName(providers[0] || {});
  const text = normalize(latestMessage);
  const reasonParts = [];
  if ((memory.preferences || []).includes("price") || (memory.painPoints || []).includes("price")) reasonParts.push("it best supports your goal of lowering the monthly bill");
  if ((memory.preferences || []).includes("reliability") || (memory.painPoints || []).includes("reliability") || (memory.householdNeeds || []).includes("workFromHome")) reasonParts.push("it is the stronger fit for dependable work-from-home service");
  if ((memory.householdNeeds || []).includes("gaming")) reasonParts.push("it is a better match for gaming and low-latency use");
  const reason = reasonParts[0] || "it is the strongest alternative among the options found for your address";
  if (/what do you suggest|what.*recommend|best option|which.*choose/.test(text)) {
    return `Based on what you told me, I recommend ${selected} because ${reason}. Final pricing and serviceability still need provider confirmation. Would you like to review the recommendation or continue to order details?`;
  }
  if (/what.*next|what do i need to do|how do i proceed|move forward/.test(text)) {
    return `The next step is to review ${selected} in the Quote Builder and select “Continue to order details.” We’ll confirm the exact plan, monthly price, equipment, and installation availability before anything is submitted.`;
  }
  if (/^(ok|okay|yes|yeah|sure)[.! ]*$/.test(text)) {
    return `My recommendation is ${selected} because ${reason}. Would you like the quick comparison, or are you ready to continue to order details?`;
  }
  return `I recommend ${selected} because ${reason}. Would you like me to explain the recommendation or move to the order details?`;
}
export function resolveAdvisorMessage({ routerResult = {}, latestMessage = "", previousAdvisorMessage = "", quote = null, providers = [] } = {}) {
  const closerMessage = routerResult?.agent?.message || routerResult?.response?.message || "";
  const normalized = normalize(closerMessage);
  const repeated = normalized && normalized === normalize(previousAdvisorMessage);
  const stalled = /i have the details i need|let[’']?s move forward with your best option/.test(normalized);
  if (closerMessage && !repeated && !stalled) return closerMessage;
  return recoveryMessage({ routerResult, latestMessage, previousAdvisorMessage, quote, providers });
}
