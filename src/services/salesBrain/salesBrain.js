const STAGES = [
  "introduction",
  "permission",
  "discovery",
  "qualification",
  "questionnaire",
  "recommendation",
  "objection_handling",
  "closing",
  "callback",
  "complete",
];

const DISPOSITIONS = [
  "Qualified",
  "Order Ready",
  "Callback Requested",
  "Not Interested",
  "No Answer",
  "Voicemail",
  "Do Not Call",
  "Wrong Number",
];

function text(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function first(...values) {
  return values.map(text).find(Boolean) || "";
}

function getAnswers(lead = {}) {
  return lead.questionnaireAnswers || lead.answers || lead.customerProfile || lead.householdProfile || {};
}

export function normalizeSalesCustomer(lead = {}) {
  const answers = getAnswers(lead);
  const currentProvider = first(
    lead.currentProvider,
    answers.currentProvider,
    lead.household?.currentProvider,
    lead.customer?.currentProvider,
  );
  const painPoint = first(
    lead.primaryPainPoint,
    lead.painPoint,
    answers.painPoint,
    answers.shoppingReason,
    lead.priority,
  );
  const timeline = first(
    lead.buyingTimeline,
    lead.switchTimeline,
    answers.buyingTimeline,
    answers.timeline,
  );
  const interest = first(lead.interestLevel, answers.interestLevel);
  const satisfaction = first(lead.customerSatisfaction, answers.customerSatisfaction, answers.satisfaction);
  const provider = first(
    lead.recommendedProvider,
    lead.recommendation?.provider,
    lead.connectiqPick?.provider,
    lead.selectedProvider,
  );
  const plan = first(
    lead.recommendedPlan,
    lead.recommendation?.plan,
    lead.connectiqPick?.plan,
    lead.selectedPlan,
  );
  return {
    id: lead.id || "",
    name: first(lead.name, `${lead.firstName || ""} ${lead.lastName || ""}`) || "the customer",
    phone: first(lead.phone, lead.mobilePhone),
    address: first(lead.address, lead.serviceAddress, lead.fullAddress),
    currentProvider,
    painPoint,
    timeline,
    interest,
    satisfaction,
    recommendedProvider: provider,
    recommendedPlan: plan,
    questionnaireComplete: Boolean(
      lead.questionnaireCompleted ||
      lead.questionnaireComplete ||
      Object.keys(answers).length >= 3
    ),
    recommendationReady: Boolean(provider),
    contactConsent: Boolean(lead.consent || lead.contactConsent || lead.phoneConsent),
    doNotCall: Boolean(lead.doNotCall || lead.internalDnc || lead.contactPreferences?.phone === false),
    callbackAt: first(lead.callbackAt, lead.followUpDate, lead.aiSales?.callbackAt),
    callAttempts: number(lead.aiSales?.callAttempts ?? lead.callAttempts),
  };
}

export function determineSalesStage(lead = {}) {
  const customer = normalizeSalesCustomer(lead);
  if (customer.doNotCall) return "complete";
  if (customer.callbackAt) return "callback";
  if (lead.aiSales?.customerAccepted || lead.orderReady || /order ready/i.test(text(lead.status))) return "closing";
  if (customer.recommendationReady) return "recommendation";
  if (customer.questionnaireComplete) return "qualification";
  if (customer.currentProvider || customer.painPoint || customer.satisfaction) return "discovery";
  if (lead.aiSales?.permissionToContinue === true) return "discovery";
  if (lead.aiSales?.conversationStarted) return "permission";
  return "introduction";
}

function simpleRecommendationReason(customer) {
  if (customer.painPoint && /outage|reliab|disconnect/i.test(customer.painPoint)) {
    return "It should give your home a steadier connection and fewer interruptions.";
  }
  if (customer.painPoint && /price|bill|cost|expensive/i.test(customer.painPoint)) {
    return "It looks like a better match for what you use without paying for more than you need.";
  }
  return "It should comfortably handle the way your household uses the internet.";
}

export function buildSalesPlan(lead = {}) {
  const customer = normalizeSalesCustomer(lead);
  const stage = determineSalesStage(lead);
  const firstName = customer.name.split(/\s+/)[0] || "there";

  const opening = customer.name === "the customer"
    ? "Hi, this is the automated ConnectIQ Sales Advisor. I’m calling to help you compare internet options for your home. Is now a good time?"
    : `Hi ${firstName}, this is the automated ConnectIQ Sales Advisor. I’m calling to help you compare internet options for your home. Is now a good time?`;

  const nextQuestions = {
    introduction: "Is now a good time for a quick conversation?",
    permission: "Are you currently happy with your internet provider?",
    discovery: customer.currentProvider
      ? "What would you most like to improve: the price, speed, or reliability?"
      : "Who is your current internet provider?",
    qualification: "How does your household mainly use the internet—streaming, gaming, working from home, or everyday browsing?",
    questionnaire: "About how many people and devices use the internet in your home?",
    recommendation: customer.recommendedProvider
      ? `Would you like me to explain why ${customer.recommendedProvider} looks like the best fit?`
      : "Would you like me to compare the best options available at your address?",
    objection_handling: "What is the biggest thing holding you back from switching today?",
    closing: "Would you like ConnectIQ to help you move forward with this service?",
    callback: "Is the scheduled callback time still good for you?",
    complete: "Is there anything else I can help you with today?",
  };

  const qualificationScore = Math.min(100,
    (customer.currentProvider ? 15 : 0) +
    (customer.painPoint ? 20 : 0) +
    (customer.timeline ? 20 : 0) +
    (customer.questionnaireComplete ? 20 : 0) +
    (customer.recommendationReady ? 20 : 0) +
    (customer.phone ? 5 : 0)
  );

  const priority = /today|now|immediate/i.test(customer.timeline) ? "Urgent"
    : /week/i.test(customer.timeline) || /very|high|ready/i.test(customer.interest) ? "High"
      : /month/i.test(customer.timeline) ? "Medium"
        : qualificationScore >= 70 ? "High" : qualificationScore >= 40 ? "Medium" : "Nurture";

  const likelyObjection = customer.painPoint && /price|bill|cost/i.test(customer.painPoint)
    ? "The customer may worry that switching will not lower the total bill."
    : customer.currentProvider
      ? "The customer may want to compare this option with the provider they already know."
      : "The customer may need more confidence before making a change.";

  const objectionResponse = customer.painPoint && /price|bill|cost/i.test(customer.painPoint)
    ? "That makes sense. My goal is not to push the biggest plan. It is to help you find an option that fits your home and your budget."
    : "That makes sense. Let’s keep it simple and compare only the few things that matter most to your home.";

  const recommendationExplanation = customer.recommendedProvider
    ? `I’d choose ${customer.recommendedProvider}${customer.recommendedPlan ? ` ${customer.recommendedPlan}` : ""}. ${simpleRecommendationReason(customer)}`
    : "Once I know a little more about your home, I can compare the available providers and explain the best fit in simple terms.";

  const missing = [];
  if (!customer.currentProvider) missing.push("current provider");
  if (!customer.painPoint) missing.push("main concern");
  if (!customer.timeline) missing.push("switching timeline");
  if (!customer.questionnaireComplete) missing.push("household questionnaire");
  if (!customer.recommendationReady) missing.push("ConnectIQ recommendation");

  return {
    version: "sales-brain-v1.0",
    stage,
    allowedStages: STAGES,
    dispositions: DISPOSITIONS,
    opening,
    nextQuestion: nextQuestions[stage],
    recommendationExplanation,
    likelyObjection,
    objectionResponse,
    closePrompt: "Based on what we discussed, would you like ConnectIQ to help you get this service started?",
    qualificationScore,
    priority,
    missing,
    nextAction: customer.doNotCall
      ? "Do not call this customer."
      : customer.callbackAt
        ? `Call back at ${customer.callbackAt}.`
        : missing.length
          ? `Capture ${missing[0]} next.`
          : "Ask for the order or schedule a specific callback.",
    customer,
  };
}

export function buildConversationSummary({ lead = {}, disposition = "", notes = "" } = {}) {
  const plan = buildSalesPlan(lead);
  const customer = plan.customer;
  const parts = [
    customer.currentProvider ? `Currently uses ${customer.currentProvider}.` : null,
    customer.painPoint ? `Main concern: ${customer.painPoint}.` : null,
    customer.timeline ? `Switching timeline: ${customer.timeline}.` : null,
    customer.recommendedProvider ? `ConnectIQ Pick: ${customer.recommendedProvider}${customer.recommendedPlan ? ` ${customer.recommendedPlan}` : ""}.` : null,
    disposition ? `Call outcome: ${disposition}.` : null,
    text(notes) ? text(notes) : null,
    `Next action: ${plan.nextAction}`,
  ].filter(Boolean);
  return parts.join(" ");
}
