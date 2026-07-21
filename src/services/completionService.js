import { buildAgentPlan } from "./brainOrchestrationService.js";

const text = (...values) => values.find((value) => String(value ?? "").trim()) || "";
const list = (...values) => values.flat().filter(Boolean);
const has = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim());

export const COMPLETION_GATES = [
  { id: "identity", label: "Customer identity" },
  { id: "availability", label: "Verified availability" },
  { id: "discovery", label: "Customer discovery" },
  { id: "recommendation", label: "Recommendation accepted" },
  { id: "quote", label: "Quote completed" },
  { id: "order", label: "Order package ready" },
  { id: "consent", label: "Contact consent" },
  { id: "submission", label: "Submission outcome" },
];

export function evaluateCompletion(lead = {}) {
  const orchestration = buildAgentPlan(lead);
  const status = text(lead.status, lead.pipelineStage).toLowerCase();
  const consent = lead.consent || lead.contactConsent || {};
  const availableProviders = list(lead.availableProviders, lead.providers, lead.providerResults);
  const recommendedProvider = text(lead.recommendedProvider, lead.recommendation?.provider, lead.salesSummary?.recommendation?.provider);
  const quoteComplete = Boolean(lead.quoteId || lead.quote?.id || /sent|viewed|accepted|order_requested/i.test(text(lead.quoteStatus, lead.quote?.status)));
  const orderScore = Number(lead.orderIQ?.readinessScore || lead.orderReadinessScore || 0);
  const orderReady = orderScore >= 100 || /ready|submitted|installed|activated|completed/i.test(status);
  const submitted = /submitted|installed|activated|completed/i.test(status) || Boolean(lead.externalOrderId || lead.dsiOrderId);
  const contactAllowed = !orchestration.state.facts.doNotContact && (consent.phone !== false || consent.email !== false || consent.sms !== false);

  const gates = [
    { id: "identity", label: "Customer identity", passed: has(orchestration.state.facts.name) && has(orchestration.state.facts.address) && (has(orchestration.state.facts.phone) || has(orchestration.state.facts.email)), detail: "Name, service address, and a contact method are required." },
    { id: "availability", label: "Verified availability", passed: availableProviders.length > 0, detail: "Address-level provider results must exist before completion." },
    { id: "discovery", label: "Customer discovery", passed: has(orchestration.state.facts.currentProvider) && has(orchestration.state.facts.monthlyBill) && orchestration.state.facts.painPoints.length > 0, detail: "Current provider, bill, and buying priority must be captured." },
    { id: "recommendation", label: "Recommendation accepted", passed: has(recommendedProvider), detail: "A selected or accepted provider recommendation is required." },
    { id: "quote", label: "Quote completed", passed: quoteComplete, detail: "QuoteIQ must have a saved customer quote." },
    { id: "order", label: "Order package ready", passed: orderReady, detail: "OrderIQ must reach 100% readiness or an equivalent completed state." },
    { id: "consent", label: "Contact consent", passed: contactAllowed, detail: "Completion cannot trigger prohibited outreach." },
    { id: "submission", label: "Submission outcome", passed: submitted, detail: "Record a DSI/carrier submission, activation, installation, or completed state." },
  ];

  const passed = gates.filter((gate) => gate.passed).length;
  const readiness = Math.round((passed / gates.length) * 100);
  const blockers = gates.filter((gate) => !gate.passed);
  const complete = blockers.length === 0;

  let nextAction = "Review the completion record";
  if (!complete) {
    const first = blockers[0].id;
    nextAction = {
      identity: "Complete the customer profile",
      availability: "Verify provider availability",
      discovery: "Finish customer discovery",
      recommendation: "Generate and confirm the recommendation",
      quote: "Create and save the customer quote",
      order: "Complete the OrderIQ package",
      consent: "Resolve contact consent restrictions",
      submission: "Submit the order and record the outcome",
    }[first];
  }

  return {
    complete,
    readiness,
    passed,
    total: gates.length,
    gates,
    blockers,
    nextAction,
    orchestration,
    completionStatus: complete ? "COMPLETED" : readiness >= 75 ? "FINAL REVIEW" : readiness >= 50 ? "IN PROGRESS" : "BLOCKED",
  };
}

export function buildCompletionQueue(leads = []) {
  const queue = leads.map((lead) => ({
    ...lead,
    customerName: text(lead.customerName, lead.name, lead.customer?.name, "Unknown Customer"),
    completion: evaluateCompletion(lead),
  })).sort((a, b) => {
    if (a.completion.complete !== b.completion.complete) return a.completion.complete ? 1 : -1;
    return b.completion.readiness - a.completion.readiness;
  });

  return {
    queue,
    metrics: {
      total: queue.length,
      complete: queue.filter((item) => item.completion.complete).length,
      finalReview: queue.filter((item) => item.completion.completionStatus === "FINAL REVIEW").length,
      blocked: queue.filter((item) => item.completion.completionStatus === "BLOCKED").length,
      averageReadiness: queue.length ? Math.round(queue.reduce((sum, item) => sum + item.completion.readiness, 0) / queue.length) : 0,
    },
  };
}
