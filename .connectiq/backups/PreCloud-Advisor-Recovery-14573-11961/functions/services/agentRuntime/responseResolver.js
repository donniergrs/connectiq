function normalize(value = "") {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

export function resolveAdvisorMessage({ routerResult = {}, previousAdvisorMessage = "", salesDecision = null } = {}) {
  const orchestrated = salesDecision?.message || "";
  if (orchestrated && normalize(orchestrated) !== normalize(previousAdvisorMessage)) return orchestrated;

  const closerMessage = routerResult?.agent?.message || routerResult?.response?.message || "";
  const repeated = normalize(closerMessage) && normalize(closerMessage) === normalize(previousAdvisorMessage);
  const stalled = /i have the details i need|let[’']?s move forward with your best option/.test(normalize(closerMessage));
  if (closerMessage && !repeated && !stalled) return closerMessage;

  const selected = salesDecision?.selectedProviderName || routerResult?.memory?.selectedProvider || "the leading provider";
  return `I recommend ${selected}. Would you like the reason, the alternatives, or the next order step?`;
}
