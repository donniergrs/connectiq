const firstText = (...values) => values.find((value) => String(value ?? "").trim()) || "";

const asDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const has = (lead, ...paths) => paths.some((path) => {
  const value = path.split(".").reduce((current, key) => current?.[key], lead);
  return Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim());
});

export const SALES_PLAYBOOKS = [
  { id: "lower-bill", label: "Lower the bill", triggers: ["lower", "bill", "expensive", "save"], opening: "Let’s compare the total monthly cost and make sure the savings are real after fees." },
  { id: "reliability", label: "Improve reliability", triggers: ["reliable", "outage", "drops", "disconnect"], opening: "Let’s focus on providers and technology that reduce interruptions at this address." },
  { id: "work-home", label: "Work from home", triggers: ["work from home", "wfh", "zoom", "remote"], opening: "A stable connection and strong upload performance matter most for working from home." },
  { id: "gaming", label: "Gaming performance", triggers: ["gaming", "latency", "ping", "lag"], opening: "Let’s prioritize low latency, consistent speeds, and enough capacity for everyone in the home." },
  { id: "moving", label: "Moving service", triggers: ["moving", "new home", "new address"], opening: "Let’s confirm what is available at the new address and line up installation timing." },
];

export function selectSalesPlaybook(lead = {}) {
  const source = [lead.painPoints, lead.customerNeeds, lead.notes, lead.conversationSummary, lead.salesSummary?.summary]
    .flat().filter(Boolean).join(" ").toLowerCase();
  return SALES_PLAYBOOKS.find((playbook) => playbook.triggers.some((trigger) => source.includes(trigger))) || {
    id: "discovery",
    label: "Complete discovery",
    opening: "Let’s confirm the customer’s priorities before presenting the best available option.",
  };
}

export function calculateOpportunityScore(lead = {}) {
  const status = firstText(lead.status, lead.pipelineStage).toLowerCase();
  let score = 10;
  const reasons = [];

  if (has(lead, "phone", "email", "customer.phone", "customer.email")) { score += 12; reasons.push("Contact method captured"); }
  if (has(lead, "serviceAddress", "address", "customer.address")) { score += 12; reasons.push("Service address captured"); }
  if (has(lead, "currentProvider", "salesSummary.currentProvider")) { score += 8; reasons.push("Current provider known"); }
  if (has(lead, "monthlyBill", "currentMonthlyPrice", "salesSummary.monthlyBill")) { score += 8; reasons.push("Current bill known"); }
  if (has(lead, "painPoints", "customerNeeds", "salesSummary.painPoints")) { score += 10; reasons.push("Customer need identified"); }
  if (has(lead, "recommendedProvider", "recommendation.provider", "salesSummary.recommendation.provider")) { score += 14; reasons.push("Recommendation available"); }
  if (has(lead, "quoteId", "quote", "quoteStatus")) { score += 14; reasons.push("Quote activity recorded"); }
  if (Number(lead.orderIQ?.readinessScore || lead.orderReadinessScore || 0) >= 100 || /order ready|ready to submit/.test(status)) { score += 12; reasons.push("Order is ready"); }
  if (/callback|follow.?up|interested|qualified/.test(status)) { score += 6; reasons.push("Active buying signal"); }
  if (/lost|closed.?lost|do not contact/.test(status)) score = Math.min(score, 15);

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function determineSalesStage(lead = {}) {
  const status = firstText(lead.status, lead.pipelineStage).toLowerCase();
  if (/submitted|installed|activated/.test(status)) return "COMPLETED";
  if (Number(lead.orderIQ?.readinessScore || lead.orderReadinessScore || 0) >= 100 || /order ready|ready to submit/.test(status)) return "ORDER_READY";
  if (has(lead, "quoteId", "quote", "quoteStatus")) return "FOLLOW_UP";
  if (has(lead, "recommendedProvider", "recommendation.provider", "salesSummary.recommendation.provider")) return "CLOSING";
  if (has(lead, "painPoints", "customerNeeds", "salesSummary.painPoints")) return "RECOMMENDATION";
  if (has(lead, "phone", "email", "customer.phone", "customer.email")) return "DISCOVERY";
  return "INTRODUCTION";
}

export function nextBestSalesAction(lead = {}) {
  const stage = determineSalesStage(lead);
  const actions = {
    INTRODUCTION: { type: "profile", label: "Capture contact information", reason: "SalesIQ needs a reliable way to continue the conversation." },
    DISCOVERY: { type: "discover", label: "Complete discovery", reason: "Confirm provider, bill, priorities, and pain points." },
    RECOMMENDATION: { type: "recommend", label: "Present best-fit provider", reason: "Discovery is sufficient to move into a verified recommendation." },
    CLOSING: { type: "quote", label: "Create and send QuoteIQ", reason: "The recommendation is ready for customer review." },
    FOLLOW_UP: { type: "followup", label: "Follow up on quote", reason: "Answer objections and collect any missing order information." },
    ORDER_READY: { type: "submit", label: "Submit order to DSI", reason: "OrderIQ indicates that the order is ready." },
    COMPLETED: { type: "track", label: "Track installation", reason: "Keep the customer informed through activation." },
  };
  return actions[stage];
}

export function buildFollowUpMessage(lead = {}) {
  const name = firstText(lead.customerName, lead.name, lead.customer?.name, "there").split(" ")[0];
  const provider = firstText(lead.recommendedProvider, lead.recommendation?.provider, lead.salesSummary?.recommendation?.provider);
  const playbook = selectSalesPlaybook(lead);
  if (provider) return `Hi ${name}, this is ConnectIQ following up on the ${provider} option we reviewed. ${playbook.opening} What question can I answer before we finalize the next step?`;
  return `Hi ${name}, this is ConnectIQ following up on your internet options. ${playbook.opening} I can continue right where we left off.`;
}

export function buildSalesIQ(leads = [], now = new Date()) {
  const records = leads.map((lead) => {
    const updatedAt = asDate(lead.updatedAt || lead.lastContactAt || lead.createdAt);
    const opportunity = calculateOpportunityScore(lead);
    return {
      ...lead,
      customerName: firstText(lead.customerName, lead.name, lead.customer?.name, "Unknown Customer"),
      address: firstText(lead.serviceAddress, lead.address, lead.customer?.address, "Address not captured"),
      stage: determineSalesStage(lead),
      nextAction: nextBestSalesAction(lead),
      playbook: selectSalesPlaybook(lead),
      opportunityScore: opportunity.score,
      scoreReasons: opportunity.reasons,
      followUpMessage: buildFollowUpMessage(lead),
      updatedAtDate: updatedAt,
    };
  });

  const active = records.filter((lead) => !["COMPLETED"].includes(lead.stage) && !/lost|do not contact/i.test(firstText(lead.status)));
  const staleThreshold = now.getTime() - (48 * 60 * 60 * 1000);
  const queue = [...active].sort((a, b) => b.opportunityScore - a.opportunityScore || (a.updatedAtDate?.getTime() || 0) - (b.updatedAtDate?.getTime() || 0));

  return {
    metrics: {
      active: active.length,
      hot: active.filter((lead) => lead.opportunityScore >= 70).length,
      quoteFollowUps: active.filter((lead) => lead.stage === "FOLLOW_UP").length,
      orderReady: active.filter((lead) => lead.stage === "ORDER_READY").length,
      stale: active.filter((lead) => !lead.updatedAtDate || lead.updatedAtDate.getTime() < staleThreshold).length,
    },
    queue,
  };
}
