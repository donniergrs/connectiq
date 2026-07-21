const firstText = (...values) => values.find((value) => String(value ?? "").trim()) || "";

const hasValue = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim());

const read = (source, path) => path.split(".").reduce((current, key) => current?.[key], source);

const hasAny = (source, paths) => paths.some((path) => hasValue(read(source, path)));

const AGENTS = {
  DISCOVERY: { id: "discovery", label: "Discovery Agent", purpose: "Collect customer, address, provider, bill, and buying-priority facts." },
  AVAILABILITY: { id: "availability", label: "Availability Agent", purpose: "Confirm address-level providers before any provider-specific claim." },
  KNOWLEDGE: { id: "knowledge", label: "Knowledge Agent", purpose: "Ground answers in ProviderIQ and verified provider information." },
  RECOMMENDATION: { id: "recommendation", label: "Recommendation Agent", purpose: "Rank eligible providers using business value and customer fit." },
  SALES: { id: "sales", label: "Sales Agent", purpose: "Handle objections, follow up, and move the customer toward a decision." },
  QUOTE: { id: "quote", label: "Quote Agent", purpose: "Build and present a verified QuoteIQ offer." },
  ORDER: { id: "order", label: "Order Agent", purpose: "Collect missing order details and prepare the DSI submission package." },
  HUMAN: { id: "human", label: "Human Advisor", purpose: "Resolve exceptions, compliance concerns, and unsupported requests." },
};

export const ORCHESTRATION_AGENTS = Object.values(AGENTS);

export function buildCustomerState(lead = {}) {
  const facts = {
    name: firstText(lead.customerName, lead.name, lead.customer?.name),
    address: firstText(lead.serviceAddress, lead.address, lead.customer?.address),
    phone: firstText(lead.phone, lead.customer?.phone),
    email: firstText(lead.email, lead.customer?.email),
    currentProvider: firstText(lead.currentProvider, lead.salesSummary?.currentProvider),
    monthlyBill: firstText(lead.monthlyBill, lead.currentMonthlyPrice, lead.salesSummary?.monthlyBill),
    painPoints: [lead.painPoints, lead.customerNeeds, lead.salesSummary?.painPoints].flat().filter(Boolean),
    availableProviders: [lead.availableProviders, lead.providers, lead.providerResults].flat().filter(Boolean),
    recommendedProvider: firstText(lead.recommendedProvider, lead.recommendation?.provider, lead.salesSummary?.recommendation?.provider),
    quoteReady: hasAny(lead, ["quoteId", "quote", "quoteStatus"]),
    orderReadiness: Number(lead.orderIQ?.readinessScore || lead.orderReadinessScore || 0),
    doNotContact: /do not contact|dnc/i.test(firstText(lead.status, lead.pipelineStage, lead.notes)),
    humanRequested: /human|person|representative|agent/i.test(firstText(lead.lastCustomerMessage, lead.notes)),
  };

  const missing = [];
  if (!facts.name) missing.push("customer name");
  if (!facts.address) missing.push("service address");
  if (!facts.phone && !facts.email) missing.push("contact method");
  if (!facts.currentProvider) missing.push("current provider");
  if (!facts.monthlyBill) missing.push("monthly bill");
  if (!facts.painPoints.length) missing.push("primary buying priority");
  if (!facts.availableProviders.length) missing.push("verified provider availability");

  return { facts, missing, completeness: Math.round(((7 - missing.length) / 7) * 100) };
}

export function selectOrchestrationAgent(lead = {}) {
  const state = buildCustomerState(lead);
  const status = firstText(lead.status, lead.pipelineStage).toLowerCase();
  let agent = AGENTS.DISCOVERY;
  let reason = "Customer discovery is not complete.";
  let confidence = 0.92;

  if (state.facts.doNotContact || state.facts.humanRequested) {
    agent = AGENTS.HUMAN;
    reason = state.facts.doNotContact ? "Automated contact is blocked by the lead status." : "The customer requested human assistance.";
    confidence = 0.99;
  } else if (!state.facts.address || !state.facts.availableProviders.length) {
    agent = state.facts.address ? AGENTS.AVAILABILITY : AGENTS.DISCOVERY;
    reason = state.facts.address ? "Provider availability must be verified before recommending a carrier." : "The service address is required before availability can be checked.";
  } else if (!state.facts.currentProvider || !state.facts.monthlyBill || !state.facts.painPoints.length) {
    agent = AGENTS.DISCOVERY;
    reason = `Discovery is missing: ${state.missing.filter((item) => !["customer name", "contact method", "verified provider availability"].includes(item)).join(", ") || "customer priorities"}.`;
  } else if (!state.facts.recommendedProvider) {
    agent = AGENTS.RECOMMENDATION;
    reason = "Verified options and customer priorities are available for ranking.";
  } else if (!state.facts.quoteReady) {
    agent = /objection|follow.?up|interested|callback/.test(status) ? AGENTS.SALES : AGENTS.QUOTE;
    reason = agent === AGENTS.SALES ? "A buying signal or objection requires a sales response before quote creation." : "The recommendation is complete and ready for QuoteIQ.";
  } else if (state.facts.orderReadiness < 100) {
    agent = /think|not ready|callback|follow.?up|objection/.test(status) ? AGENTS.SALES : AGENTS.ORDER;
    reason = agent === AGENTS.SALES ? "The customer needs objection recovery or follow-up." : "A quote exists, but OrderIQ still has missing information.";
  } else if (/submitted|installed|activated|completed/.test(status)) {
    agent = AGENTS.KNOWLEDGE;
    reason = "The sale is complete; continue with installation and customer-status support.";
    confidence = 0.84;
  } else {
    agent = AGENTS.ORDER;
    reason = "OrderIQ is complete and the package is ready for submission.";
  }

  return { agent, reason, confidence, state };
}

export function buildAgentPlan(lead = {}) {
  const selection = selectOrchestrationAgent(lead);
  const { facts } = selection.state;
  const steps = [];

  const add = (agent, action, status = "PENDING") => steps.push({ agent: agent.label, action, status });
  add(AGENTS.DISCOVERY, "Confirm customer profile, current service, price, and priorities", facts.currentProvider && facts.monthlyBill && facts.painPoints.length ? "COMPLETE" : "ACTIVE");
  add(AGENTS.AVAILABILITY, "Verify address-level provider availability", facts.availableProviders.length ? "COMPLETE" : selection.agent.id === AGENTS.AVAILABILITY.id ? "ACTIVE" : "BLOCKED");
  add(AGENTS.RECOMMENDATION, "Rank eligible providers and explain the best fit", facts.recommendedProvider ? "COMPLETE" : selection.agent.id === AGENTS.RECOMMENDATION.id ? "ACTIVE" : "PENDING");
  add(AGENTS.QUOTE, "Create and present the customer quote", facts.quoteReady ? "COMPLETE" : selection.agent.id === AGENTS.QUOTE.id ? "ACTIVE" : "PENDING");
  add(AGENTS.SALES, "Handle objections and secure the next commitment", selection.agent.id === AGENTS.SALES.id ? "ACTIVE" : facts.quoteReady ? "READY" : "PENDING");
  add(AGENTS.ORDER, "Complete OrderIQ and prepare DSI submission", facts.orderReadiness >= 100 ? "READY" : selection.agent.id === AGENTS.ORDER.id ? "ACTIVE" : "PENDING");

  return {
    ...selection,
    steps,
    nextAction: steps.find((step) => step.status === "ACTIVE")?.action || (facts.orderReadiness >= 100 ? "Submit the completed order to DSI" : selection.reason),
    safeguards: [
      "Never recommend the customer’s current provider.",
      "Do not state provider-specific pricing without verified address-level data.",
      "Respect consent and do-not-contact status before automated follow-up.",
      "Escalate unsupported, contradictory, or compliance-sensitive requests to a human advisor.",
    ],
  };
}

export function buildOrchestrationQueue(leads = []) {
  const queue = leads.map((lead) => ({
    ...lead,
    customerName: firstText(lead.customerName, lead.name, lead.customer?.name, "Unknown Customer"),
    orchestration: buildAgentPlan(lead),
  })).sort((a, b) => {
    const aHuman = a.orchestration.agent.id === "human" ? 1 : 0;
    const bHuman = b.orchestration.agent.id === "human" ? 1 : 0;
    if (aHuman !== bHuman) return bHuman - aHuman;
    return a.orchestration.state.completeness - b.orchestration.state.completeness;
  });

  return {
    metrics: {
      total: queue.length,
      humanEscalations: queue.filter((item) => item.orchestration.agent.id === "human").length,
      availabilityBlocked: queue.filter((item) => item.orchestration.agent.id === "availability").length,
      recommendationReady: queue.filter((item) => item.orchestration.agent.id === "recommendation").length,
      orderActive: queue.filter((item) => item.orchestration.agent.id === "order").length,
    },
    queue,
  };
}
