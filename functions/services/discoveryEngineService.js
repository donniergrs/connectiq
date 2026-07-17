const clean = (value) => String(value ?? "").trim();
const lower = (value) => clean(value).toLowerCase();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const DISCOVERY_FIELDS = [
  "permissionToContinue", "currentProvider", "monthlyBill", "satisfaction",
  "primaryPainPoint", "householdUsage", "people", "devices", "switchTimeline",
  "preferredContact", "bestContactTime", "contractStatus"
];

export function normalizeDiscovery(lead = {}) {
  const source = { ...(lead.questionnaireAnswers || {}), ...(lead.aiSales?.discovery || {}), ...lead };
  const usage = source.householdUsage || source.usage || source.internetUsage || [];
  return {
    permissionToContinue: source.permissionToContinue === true || lead.aiSales?.permissionToContinue === true,
    currentProvider: clean(source.currentProvider),
    monthlyBill: number(source.monthlyBill || source.currentMonthlyBill),
    satisfaction: number(source.satisfaction || source.customerSatisfaction),
    primaryPainPoint: clean(source.primaryPainPoint || source.painPoint || source.shoppingReason),
    householdUsage: Array.isArray(usage) ? usage.filter(Boolean) : clean(usage).split(",").map(clean).filter(Boolean),
    people: number(source.people || source.householdSize),
    devices: number(source.devices || source.deviceCount),
    switchTimeline: clean(source.switchTimeline || source.buyingTimeline || source.timeline),
    preferredContact: clean(source.preferredContact || source.contactMethod),
    bestContactTime: clean(source.bestContactTime || source.contactWindow),
    contractStatus: clean(source.contractStatus),
  };
}

export function scoreDiscovery(discovery = {}) {
  let score = 0;
  const reasons = [];
  const risks = [];
  const pain = lower(discovery.primaryPainPoint);
  const timeline = lower(discovery.switchTimeline);

  if (discovery.permissionToContinue) { score += 5; reasons.push("Customer agreed to continue the conversation"); }
  if (discovery.currentProvider) { score += 8; reasons.push("Current provider is known"); }
  if (discovery.monthlyBill >= 100) { score += 15; reasons.push("Current bill is $100 or more"); }
  else if (discovery.monthlyBill > 0) score += 6;
  if (discovery.satisfaction > 0 && discovery.satisfaction <= 2) { score += 18; reasons.push("Customer reports low satisfaction"); }
  else if (discovery.satisfaction === 3) score += 8;
  else if (discovery.satisfaction >= 4) risks.push("Customer is currently satisfied");
  if (/outage|reliab|disconnect|slow|buffer|price|bill|cost|support/.test(pain)) { score += 17; reasons.push("Customer has a clear service or price pain point"); }
  if (/today|now|immediate|this week|7 day/.test(timeline)) { score += 20; reasons.push("Customer wants to act within one week"); }
  else if (/2 week|two week|month|30 day/.test(timeline)) { score += 14; reasons.push("Customer wants to act within 30 days"); }
  else if (/later|research|unsure|not sure/.test(timeline)) risks.push("Switching timeline is not firm");
  if (discovery.householdUsage.some((item) => /work|gaming|stream|school/i.test(item))) { score += 8; reasons.push("Household has meaningful internet usage needs"); }
  if (discovery.preferredContact) score += 4;
  if (discovery.bestContactTime) score += 3;
  if (/contract|early termination|etf/i.test(lower(discovery.contractStatus))) risks.push("Existing contract may slow the sale");

  score = Math.min(100, score);
  const confidence = DISCOVERY_FIELDS.filter((field) => {
    const value = discovery[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(value || value === true);
  }).length / DISCOVERY_FIELDS.length;
  const priority = score >= 75 ? "Urgent" : score >= 58 ? "High" : score >= 35 ? "Medium" : "Nurture";
  const closeProbability = Math.max(5, Math.min(90, Math.round(score * 0.82 + confidence * 12)));
  return { score, priority, closeProbability, confidence: Math.round(confidence * 100), reasons, risks };
}

export function nextDiscoveryQuestion(discovery = {}) {
  if (!discovery.permissionToContinue) return { field: "permissionToContinue", question: "Is now a good time for a quick conversation about your internet service?" };
  if (!discovery.currentProvider) return { field: "currentProvider", question: "Who is your current internet provider?" };
  if (!discovery.satisfaction) return { field: "satisfaction", question: "On a scale from 1 to 5, how happy are you with your current internet service?" };
  if (!discovery.primaryPainPoint) return { field: "primaryPainPoint", question: "What would you most like to improve: the bill, speed, reliability, Wi-Fi coverage, or customer support?" };
  if (!discovery.monthlyBill) return { field: "monthlyBill", question: "About how much is your internet bill each month?" };
  if (!discovery.householdUsage.length) return { field: "householdUsage", question: "How does your household mainly use the internet—streaming, gaming, working from home, school, or everyday browsing?" };
  if (!discovery.people) return { field: "people", question: "How many people regularly use the internet in your home?" };
  if (!discovery.devices) return { field: "devices", question: "About how many connected devices do you have?" };
  if (!discovery.switchTimeline) return { field: "switchTimeline", question: "When would you consider changing providers?" };
  if (!discovery.preferredContact) return { field: "preferredContact", question: "Would you prefer a follow-up by phone, text, or email?" };
  if (!discovery.bestContactTime) return { field: "bestContactTime", question: "What is the best day and time to reach you?" };
  return { field: "complete", question: "I have what I need. May I compare the best available options for your address?" };
}

export function buildDiscoveryPlan(lead = {}) {
  const discovery = normalizeDiscovery(lead);
  const scoring = scoreDiscovery(discovery);
  const next = nextDiscoveryQuestion(discovery);
  const completedFields = DISCOVERY_FIELDS.filter((field) => Array.isArray(discovery[field]) ? discovery[field].length : Boolean(discovery[field] || discovery[field] === true));
  return {
    version: "discovery-engine-v1.0",
    discovery,
    scoring,
    next,
    completedFields,
    completionPercent: Math.round((completedFields.length / DISCOVERY_FIELDS.length) * 100),
    complete: next.field === "complete",
    nextAction: next.field === "complete" ? "Generate a provider recommendation and ask for the sale." : `Capture ${next.field}.`,
    summary: [
      discovery.currentProvider && `Currently uses ${discovery.currentProvider}.`,
      discovery.monthlyBill && `Pays about $${discovery.monthlyBill} per month.`,
      discovery.satisfaction && `Satisfaction is ${discovery.satisfaction}/5.`,
      discovery.primaryPainPoint && `Main concern: ${discovery.primaryPainPoint}.`,
      discovery.switchTimeline && `Switching timeline: ${discovery.switchTimeline}.`,
      `Lead priority: ${scoring.priority}.`,
    ].filter(Boolean).join(" "),
  };
}
