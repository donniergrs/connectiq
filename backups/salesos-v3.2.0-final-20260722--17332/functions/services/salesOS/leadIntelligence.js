const joinNatural = (items = []) => {
  const values = [...new Set(items.filter(Boolean))];
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
};

export function buildLeadIntelligence({ profile, ranked = [], selected = null, comparisonIntent = null } = {}) {
  const f = profile.facts || {};
  const priorities = [...new Set([...(profile.priorities || []), ...(f.decisionPriorities || []), ...(f.decisionPriorities?.length ? [] : [f.decisionPriority])].filter((value) => value && !(f.decisionPriorities?.length && value === "balance")))];
  const usage = [...new Set([...(profile.needs || []), f.usageImpact].filter(Boolean))];
  const recommended = ranked.slice(0, 3).map((item) => item.name);
  const focus = selected?.name || (comparisonIntent ? `${comparisonIntent} comparison across ${joinNatural(recommended)}` : joinNatural(recommended));
  const sentences = [];
  const name = f.preferredName || f.customerName || "Customer";
  if (f.currentProvider) sentences.push(`${name} currently has ${f.currentProvider}${f.monthlyBill ? ` and pays approximately $${f.monthlyBill} per month` : ""}.`);
  if (priorities.length) sentences.push(`The customer's priorities are ${joinNatural(priorities)}.`);
  if (usage.length) sentences.push(`Primary internet use includes ${joinNatural(usage)}.`);
  if (f.buyingTimeline || f.switchIntent) sentences.push(`The requested switching timeline is ${f.buyingTimeline || f.switchIntent}.`);
  if (focus) sentences.push(`The follow-up should focus on ${focus}.`);
  if (f.bestContactTime) sentences.push(`Preferred callback timing is ${f.bestContactTime}.`);
  const nextAction = f.bestContactTime === "as soon as possible" || /immediately|asap/i.test(f.buyingTimeline || f.switchIntent || "")
    ? "Call ASAP"
    : comparisonIntent ? `Send ${comparisonIntent} comparison` : selected ? `Verify and quote ${selected.name}` : "Review provider options";
  return { leadSummary: sentences.join(" "), nextActionLabel: nextAction, recommendedProviders: recommended, comparisonRequested: Boolean(comparisonIntent), comparisonIntent };
}
