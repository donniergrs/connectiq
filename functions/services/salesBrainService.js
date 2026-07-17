const STAGES = ["introduction", "permission", "discovery", "qualification", "questionnaire", "recommendation", "objection_handling", "closing", "callback", "complete"];
const DISPOSITIONS = ["Qualified", "Order Ready", "Callback Requested", "Not Interested", "No Answer", "Voicemail", "Do Not Call", "Wrong Number"];

const clean = (value) => String(value ?? "").trim();
const first = (...values) => values.map(clean).find(Boolean) || "";

function profile(lead = {}) {
  const answers = lead.questionnaireAnswers || lead.answers || lead.customerProfile || {};
  return {
    name: first(lead.name, `${lead.firstName || ""} ${lead.lastName || ""}`) || "the customer",
    currentProvider: first(lead.currentProvider, answers.currentProvider),
    painPoint: first(lead.primaryPainPoint, lead.painPoint, answers.painPoint, answers.shoppingReason, lead.priority),
    timeline: first(lead.buyingTimeline, lead.switchTimeline, answers.buyingTimeline),
    recommendedProvider: first(lead.recommendedProvider, lead.recommendation?.provider, lead.connectiqPick?.provider),
    recommendedPlan: first(lead.recommendedPlan, lead.recommendation?.plan, lead.connectiqPick?.plan),
    questionnaireComplete: Boolean(lead.questionnaireCompleted || lead.questionnaireComplete || Object.keys(answers).length >= 3),
    callbackAt: first(lead.callbackAt, lead.followUpDate, lead.aiSales?.callbackAt),
    doNotCall: Boolean(lead.doNotCall || lead.internalDnc),
  };
}

function stageFor(lead, customer) {
  if (customer.doNotCall) return "complete";
  if (customer.callbackAt) return "callback";
  if (lead.aiSales?.customerAccepted || lead.orderReady) return "closing";
  if (customer.recommendedProvider) return "recommendation";
  if (customer.questionnaireComplete) return "qualification";
  if (customer.currentProvider || customer.painPoint) return "discovery";
  if (lead.aiSales?.conversationStarted) return "permission";
  return "introduction";
}

export function createSalesBrainPlan(lead = {}) {
  const customer = profile(lead);
  const stage = stageFor(lead, customer);
  const firstName = customer.name.split(/\s+/)[0] || "there";
  const questions = {
    introduction: "Is now a good time for a quick conversation?",
    permission: "Are you currently happy with your internet provider?",
    discovery: customer.currentProvider ? "What would you most like to improve: price, speed, or reliability?" : "Who is your current internet provider?",
    qualification: "How does your household mainly use the internet?",
    questionnaire: "About how many people and devices use the internet in your home?",
    recommendation: customer.recommendedProvider ? `Would you like me to explain why ${customer.recommendedProvider} looks like the best fit?` : "Would you like me to compare your available options?",
    objection_handling: "What is the biggest thing holding you back?",
    closing: "Would you like ConnectIQ to help you get this service started?",
    callback: "Is the scheduled callback time still good for you?",
    complete: "Is there anything else I can help you with?",
  };
  const missing = [];
  if (!customer.currentProvider) missing.push("current provider");
  if (!customer.painPoint) missing.push("main concern");
  if (!customer.timeline) missing.push("switching timeline");
  if (!customer.questionnaireComplete) missing.push("household questionnaire");
  if (!customer.recommendedProvider) missing.push("ConnectIQ recommendation");
  return {
    ok: true,
    version: "sales-brain-v1.0",
    stage,
    allowedStages: STAGES,
    dispositions: DISPOSITIONS,
    opening: `Hi ${firstName}, this is the automated ConnectIQ Sales Advisor. I’m calling to help you compare internet options for your home. Is now a good time?`,
    nextQuestion: questions[stage],
    missing,
    nextAction: customer.doNotCall ? "Do not call this customer." : customer.callbackAt ? `Call back at ${customer.callbackAt}.` : missing.length ? `Capture ${missing[0]} next.` : "Ask for the order or schedule a specific callback.",
    customer,
  };
}
