export function friendlyName(facts = {}) {
  return facts.preferredName || facts.customerName || "";
}

export function discoveryAcknowledgement(profile = {}, nextKey) {
  const f = profile.facts || {};
  const priorities = profile.priorities instanceof Set ? profile.priorities : new Set(profile.priorities || []);
  const painPoints = profile.painPoints instanceof Set ? profile.painPoints : new Set(profile.painPoints || []);
  const needs = profile.needs instanceof Set ? profile.needs : new Set(profile.needs || []);
  const name = friendlyName(f);
  if (nextKey === "ask_name" && f.currentProvider && f.monthlyBill && (priorities.has("price") || painPoints.has("price"))) {
    return `I understand. You're paying about $${f.monthlyBill} a month with ${f.currentProvider} and want to lower that bill. Let's look for savings without giving up the service quality you need. `;
  }
  if (nextKey === "ask_customer_impact" && name) return `Thanks, ${name}. That gives me a clear starting point. `;
  if (nextKey === "ask_decision_priority" && needs.has("workFromHome")) return "Since you work from home, reliability matters, but I also want to match the service to your budget and speed needs. ";
  if (nextKey === "ask_switch_intent") return "That helps me narrow the options. ";
  return "";
}

export function providerBenefits(item, profile = {}) {
  const tech = String(item.provider.technology || item.provider.technologyType || item.provider.technology_code_type || "Broadband");
  const benefits = [];
  const priorities = profile.priorities instanceof Set ? profile.priorities : new Set(profile.priorities || []);
  const needs = profile.needs instanceof Set ? profile.needs : new Set(profile.needs || []);
  if (/fiber|fttp/i.test(tech)) {
    if (priorities.has("reliability") || needs.has("workFromHome")) benefits.push("strong reliability for working from home");
    if (priorities.has("speed") || needs.has("streaming") || needs.has("gaming")) benefits.push("high-capacity performance for streaming and other demanding use");
    if (priorities.has("price")) benefits.push("worth checking for a lower total monthly cost");
  } else if (/cable|docsis/i.test(tech)) {
    if (priorities.has("price")) benefits.push("may offer competitive introductory pricing");
    if (needs.has("streaming") || needs.has("gaming")) benefits.push("can support high-bandwidth household use");
  } else {
    benefits.push("provides another eligible alternative to verify at the address");
  }
  if (!benefits.length) benefits.push(`${tech} is one of the strongest eligible alternatives at the address`);
  return benefits.slice(0, 3);
}
