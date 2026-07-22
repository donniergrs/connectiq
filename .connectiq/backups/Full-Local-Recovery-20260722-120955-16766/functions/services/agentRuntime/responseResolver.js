export function resolveAdvisorMessage({ routerResult = {} } = {}) {
  const closerMessage = routerResult?.agent?.message || routerResult?.response?.message || "";
  if (closerMessage) return closerMessage;
  return "Thanks—I’m with you. What would you most like to improve about your current internet service?";
}
