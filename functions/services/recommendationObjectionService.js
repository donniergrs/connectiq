const OBJECTIONS = [
  { key: "happy", label: "Happy with current provider", examples: ["I'm happy", "service is fine"], response: "That makes sense. I would not ask you to change unless there is a clear benefit. May I show you the one option that best matches what you told me, so you can compare?", followUp: "What would have to improve for switching to be worth it?", nextAction: "Compare without pressure" },
  { key: "expensive", label: "Price concern", examples: ["too expensive", "costs too much"], response: "I understand. The goal is not to sell you more speed than you need. Let’s compare the total monthly cost and choose the option that gives your household enough service without overpaying.", followUp: "What monthly amount would feel comfortable?", nextAction: "Reframe around total value" },
  { key: "contract", label: "Under contract", examples: ["under contract", "early termination"], response: "That is important to check before making a change. We can compare the benefit now, then decide whether waiting until the contract ends is smarter.", followUp: "Do you know when the contract ends or what the early termination charge would be?", nextAction: "Schedule contract-end follow-up" },
  { key: "spouse", label: "Needs another decision-maker", examples: ["ask my spouse", "talk to my husband", "talk to my wife"], response: "Absolutely. I can make this easy by giving you a simple summary of the recommendation, expected price, and why it fits your home.", followUp: "Would it help to schedule a quick call when both of you are available?", nextAction: "Schedule joint callback" },
  { key: "time", label: "No time", examples: ["don't have time", "busy right now"], response: "I understand. I can keep this to one minute or schedule a better time. I only need to confirm the best option and next step.", followUp: "Would later today or another day be better?", nextAction: "Schedule callback" },
  { key: "think", label: "Needs time to think", examples: ["think about it", "maybe later"], response: "Of course. Before I let you go, what part would you like to think through—price, reliability, installation, or the provider itself?", followUp: "What is the main question keeping you from deciding today?", nextAction: "Identify the real hesitation" },
];

function text(v){ return String(v || "").trim(); }
function num(v){ const n=Number(v); return Number.isFinite(n) ? n : 0; }
function lower(v){ return text(v).toLowerCase(); }
function first(...values){ return values.find((v)=>text(v)) || ""; }

function normalizeLead(lead={}) {
  const discovery = lead.salesDiscovery || lead.discovery || {};
  const recommendation = lead.recommendation || lead.salesSummary?.recommendation || lead.quote || {};
  const customer = lead.customer || {};
  const provider = first(recommendation.provider, recommendation.providerName, recommendation.brandName, lead.recommendedProvider, "the recommended provider");
  const plan = first(recommendation.plan, recommendation.planName, recommendation.tier, "the best-fit plan");
  const price = num(first(recommendation.monthlyPrice, recommendation.price, recommendation.estimatedMonthlyPrice));
  const currentProvider = first(discovery.currentProvider, lead.currentProvider, customer.currentProvider);
  const pain = first(discovery.primaryPainPoint, lead.primaryPainPoint, lead.painPoint, "a better overall internet experience");
  const timeline = first(discovery.switchTimeline, lead.switchTimeline, lead.buyingTimeline);
  const usage = discovery.householdUsage || lead.householdUsage || lead.needs?.usage || [];
  const satisfaction = num(first(discovery.satisfaction, lead.satisfaction));
  const currentBill = num(first(discovery.monthlyBill, lead.monthlyBill, lead.currentMonthlyBill));
  const likely = lower(first(lead.likelyObjection, lead.aiSales?.likelyObjection, lead.salesBrain?.likelyObjection));
  return { provider, plan, price, currentProvider, pain, timeline, usage:Array.isArray(usage)?usage:[], satisfaction, currentBill, likely, recommendation };
}

function selectObjection(n) {
  if (n.likely) {
    const found=OBJECTIONS.find((o)=> n.likely.includes(o.key) || o.examples.some((e)=>n.likely.includes(e)));
    if(found) return found;
  }
  if(n.satisfaction >= 4) return OBJECTIONS[0];
  if(n.currentBill && n.price && n.price > n.currentBill) return OBJECTIONS[1];
  return OBJECTIONS[5];
}

export function buildRecommendationStrategy(lead={}) {
  const n=normalizeLead(lead);
  const reasons=[];
  if(n.pain) reasons.push(`It addresses the customer's concern about ${n.pain.toLowerCase()}.`);
  if(n.usage.length) reasons.push(`It supports ${n.usage.slice(0,3).join(", ").toLowerCase()}.`);
  if(n.currentBill && n.price && n.price < n.currentBill) reasons.push(`The estimated monthly price is about $${Math.round(n.currentBill-n.price)} lower than the current bill.`);
  if(!reasons.length) reasons.push("It is the strongest available fit based on the customer profile.");
  const comparison = n.price ? `${n.provider} ${n.plan} is estimated around $${Math.round(n.price)} per month.` : `${n.provider} ${n.plan} is the current best-fit recommendation.`;
  const explanation = `Based on what you told me, I recommend ${n.provider}. ${comparison} ${reasons[0]}`;
  const primaryObjection=selectObjection(n);
  const readiness = n.timeline && /today|now|week|30 day|month/i.test(n.timeline) ? "ready" : n.satisfaction && n.satisfaction <= 2 ? "interested" : "hesitant";
  const close = readiness === "ready"
    ? `This looks like a strong fit. Would you like me to move forward with the next step to connect your home?`
    : `Would you like me to save this recommendation and schedule a time to finish the order?`;
  return {
    version:"recommendation-objection-v1.0",
    stage: readiness,
    recommendation:{ provider:n.provider, plan:n.plan, price:n.price, explanation, reasons, comparison },
    primaryObjection,
    objections:OBJECTIONS,
    close:{ prompt:close, nextAction: readiness === "ready" ? "Prepare order" : "Schedule follow-up" },
    guardrails:["Do not guarantee savings, speeds, installation dates, or availability.","Use verified quote data only.","Do not pressure the customer after a clear refusal.","Explain tradeoffs in plain language."],
    summary:`Recommend ${n.provider}. Likely objection: ${primaryObjection.label}. Next action: ${readiness === "ready" ? "ask for the order" : "resolve the concern and schedule follow-up"}.`,
  };
}

export { OBJECTIONS };
