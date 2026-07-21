function providerEquals(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

export function buildRecommendationReasons(item, profile = {}) {
  if (!item) return [];
  const p = item.provider;
  const reasons = [];
  if (p.technology === "fiber") reasons.push("Fiber service is available and offers strong upload performance and low latency.");
  if (profile.workFromHome) reasons.push("It is a strong fit for dependable video calls and remote work.");
  if (profile.gaming) reasons.push("Its latency and speed profile is well suited for gaming.");
  if (profile.streaming) reasons.push("It provides enough capacity for streaming across connected devices.");
  if (profile.pricePriority === "High" && p.monthlyPrice != null) reasons.push("The available price aligns with the customer's goal of lowering the monthly bill.");
  if (profile.reliabilityPriority === "High") reasons.push("Reliability is a major customer priority, and this option scored strongly for service stability.");
  if (profile.currentProvider && !providerEquals(profile.currentProvider, p.name)) reasons.push(`It gives the customer an alternative to ${profile.currentProvider}.`);
  return reasons.slice(0, 5);
}

export function nextQuestion(missing = []) {
  const prompts = {
    "current provider": "Who is your current internet provider?",
    "current monthly bill": "About how much do you pay each month for internet?",
    "primary internet usage": "What matters most in your home: working from home, gaming, streaming, or basic browsing?",
    "main reason for switching": "What is the main reason you are considering a change: price, reliability, speed, or Wi-Fi coverage?",
  };
  return missing.length ? prompts[missing[0]] : null;
}
