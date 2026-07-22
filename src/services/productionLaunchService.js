import { evaluateCompletion } from "./completionService.js";

const first = (...values) => values.find((value) => String(value ?? "").trim()) || "";
const array = (...values) => values.flat().filter(Boolean);
const number = (...values) => {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return value === undefined ? 0 : Number(value);
};

export const LAUNCH_GATES = [
  { id: "firebase", label: "Firebase project configured", critical: true },
  { id: "hosting", label: "Production domain configured", critical: true },
  { id: "firestore", label: "Firestore lead access", critical: true },
  { id: "journey", label: "Lead-to-order journey validated", critical: true },
  { id: "dsi", label: "DSI submission package", critical: true },
  { id: "errors", label: "Failed transaction visibility", critical: false },
  { id: "firstSale", label: "First-sale tracking", critical: false },
];

export function buildLaunchReadiness({ leads = [], config = {}, firestoreConnected = false, domain = "", online = true } = {}) {
  const evaluated = leads.map((lead) => ({ ...lead, completion: evaluateCompletion(lead) }));
  const completed = evaluated.filter((lead) => lead.completion.complete);
  const orderReady = evaluated.filter((lead) => lead.completion.gates.find((gate) => gate.id === "order")?.passed);
  const failed = evaluated.filter((lead) => /failed|error|rejected|cancelled/i.test(first(lead.status, lead.pipelineStage, lead.submissionStatus)) || array(lead.errors, lead.transactionErrors).length > 0);
  const submitted = evaluated.filter((lead) => /submitted|installed|activated|completed/i.test(first(lead.status, lead.pipelineStage)) || lead.dsiOrderId || lead.externalOrderId);
  const firebaseReady = Boolean(config.projectId && config.apiKey && config.appId);
  const hostingReady = Boolean(domain && !/localhost|127\.0\.0\.1/i.test(domain));
  const dsiReady = orderReady.some((lead) => Boolean(buildDsiSubmissionPackage(lead).customer.serviceAddress));
  const firstSale = submitted.find((lead) => /installed|activated|completed/i.test(first(lead.status, lead.pipelineStage))) || null;

  const gates = [
    { id: "firebase", label: "Firebase project configured", passed: firebaseReady, critical: true, detail: firebaseReady ? config.projectId : "Firebase project settings are incomplete." },
    { id: "hosting", label: "Production domain configured", passed: hostingReady, critical: true, detail: hostingReady ? domain : "Open this page from the production domain after deployment." },
    { id: "firestore", label: "Firestore lead access", passed: firestoreConnected, critical: true, detail: firestoreConnected ? `${leads.length} lead record(s) available.` : "The production client could not confirm Firestore access." },
    { id: "journey", label: "Lead-to-order journey validated", passed: completed.length > 0, critical: true, detail: completed.length ? `${completed.length} transaction(s) passed all completion gates.` : "Complete one test customer from address through submission." },
    { id: "dsi", label: "DSI submission package", passed: dsiReady, critical: true, detail: dsiReady ? `${orderReady.length} order-ready lead(s) can be exported.` : "No order-ready lead has enough data for a submission package." },
    { id: "errors", label: "Failed transaction visibility", passed: online && firestoreConnected, critical: false, detail: `${failed.length} failed or exception transaction(s) detected.` },
    { id: "firstSale", label: "First-sale tracking", passed: Boolean(firstSale), critical: false, detail: firstSale ? `First completed sale: ${first(firstSale.customerName, firstSale.name, firstSale.id)}` : "No activated or completed sale has been recorded yet." },
  ];

  const criticalBlockers = gates.filter((gate) => gate.critical && !gate.passed);
  const passed = gates.filter((gate) => gate.passed).length;
  const score = Math.round((passed / gates.length) * 100);

  return {
    launchReady: criticalBlockers.length === 0,
    score,
    gates,
    criticalBlockers,
    metrics: { totalLeads: leads.length, completed: completed.length, orderReady: orderReady.length, submitted: submitted.length, failed: failed.length },
    completed,
    orderReady,
    failed,
    firstSale,
    nextAction: criticalBlockers[0]?.detail || (firstSale ? "Monitor the production funnel and protect conversion." : "Submit and activate the first production sale."),
  };
}

export function buildDsiSubmissionPackage(lead = {}) {
  const provider = first(lead.recommendedProvider, lead.recommendation?.provider, lead.selectedProvider, lead.order?.provider);
  return {
    packageVersion: "AI-014-v1",
    generatedAt: new Date().toISOString(),
    leadId: first(lead.id, lead.leadId),
    customer: {
      name: first(lead.customerName, lead.name, lead.customer?.name),
      phone: first(lead.phone, lead.customer?.phone),
      email: first(lead.email, lead.customer?.email),
      serviceAddress: first(lead.address, lead.serviceAddress, lead.customer?.address),
    },
    service: {
      provider,
      plan: first(lead.selectedPlan, lead.planName, lead.quote?.planName, lead.order?.planName),
      speed: first(lead.selectedSpeed, lead.quote?.speed, lead.order?.speed),
      monthlyPrice: number(lead.monthlyPrice, lead.quote?.monthlyPrice, lead.order?.monthlyPrice),
      promotion: first(lead.promotion, lead.quote?.promotion),
    },
    authorization: {
      phone: lead.consent?.phone !== false,
      email: lead.consent?.email !== false,
      sms: lead.consent?.sms !== false,
      doNotContact: /do not contact/i.test(first(lead.status, lead.contactStatus)),
    },
    submission: {
      status: first(lead.submissionStatus, lead.status, "Order Ready"),
      externalOrderId: first(lead.dsiOrderId, lead.externalOrderId),
      notes: first(lead.orderNotes, lead.notes, lead.salesSummary?.notes),
    },
  };
}

export function dsiPackageToCsv(pkg) {
  const row = {
    leadId: pkg.leadId,
    customerName: pkg.customer.name,
    phone: pkg.customer.phone,
    email: pkg.customer.email,
    serviceAddress: pkg.customer.serviceAddress,
    provider: pkg.service.provider,
    plan: pkg.service.plan,
    speed: pkg.service.speed,
    monthlyPrice: pkg.service.monthlyPrice,
    promotion: pkg.service.promotion,
    submissionStatus: pkg.submission.status,
    externalOrderId: pkg.submission.externalOrderId,
    notes: pkg.submission.notes,
  };
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return `${Object.keys(row).map(escape).join(",")}\n${Object.values(row).map(escape).join(",")}\n`;
}
