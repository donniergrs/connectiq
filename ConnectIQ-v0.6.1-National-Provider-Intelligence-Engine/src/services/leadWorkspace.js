import { asDate, leadQuality, leadStatus, monthlyPrice, nextAction, planName, providerName, readinessScore } from "./advisorDashboard.js";

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value, fallback = "Not captured") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function leadCustomer(lead = {}) {
  const summary = lead.salesSummary?.customer || {};
  return {
    name: text(lead.name || summary.name, "Unknown Customer"),
    email: text(lead.email || summary.email),
    phone: text(lead.phone || summary.phone),
    address: text(lead.address || summary.serviceAddress, "No service address captured"),
    consent: Boolean(lead.consent ?? summary.consent),
  };
}

export function leadHousehold(lead = {}) {
  const summary = lead.salesSummary?.household || {};
  const needs = lead.needs || lead.customerProfile || {};
  const usage = summary.usage || [
    needs.workFromHome && "Remote work",
    needs.streaming && "Streaming",
    needs.gaming && "Gaming",
    needs.creator && "Large uploads",
    needs.reliability && "Maximum reliability",
  ].filter(Boolean);

  return {
    people: number(summary.people ?? needs.people),
    devices: number(summary.devices ?? needs.devices),
    budget: number(summary.budget ?? needs.budget),
    priority: text(summary.priority || needs.priority, "Not selected"),
    usage: unique(usage),
    currentProvider: text(lead.currentProvider || lead.existingProvider || needs.currentProvider),
  };
}

export function leadRecommendation(lead = {}) {
  const summary = lead.salesSummary?.recommendation || {};
  const snapshot = lead.recommendationSnapshot || {};
  const quote = lead.quote || lead.salesSummary?.quote || {};
  return {
    provider: providerName(lead),
    plan: planName(lead),
    technology: text(summary.technology || snapshot.technology || quote.technology),
    matchScore: number(summary.matchScore ?? snapshot.advisorScore ?? quote.advisorScore),
    confidence: number(summary.confidence ?? snapshot.confidence),
    download: number(summary.download ?? quote.download ?? snapshot.download),
    upload: number(summary.upload ?? quote.upload ?? snapshot.upload),
    monthlyPrice: monthlyPrice(lead),
    installationMethod: text(lead.salesSummary?.quote?.installationMethod || quote.installation?.method),
    installationWindow: text(lead.salesSummary?.quote?.installationWindow || quote.installation?.estimatedWindow),
    reasons: unique(summary.reasons || quote.reasons || snapshot.recommendationReasons || []).slice(0, 4),
    nextBest: summary.nextBest || null,
  };
}

export function leadCoaching(lead = {}) {
  const notes = lead.salesSummary?.advisorNotes || {};
  return {
    likelyObjection: text(notes.likelyObjection, "Verify the customer's current concerns before presenting the offer."),
    primarySellingPoint: text(notes.primarySellingPoint, "Lead with the personalized fit and current provider availability."),
    talkingPoints: unique(notes.suggestedTalkingPoints || []).slice(0, 4),
    nextAction: nextAction(lead),
  };
}

export function leadConversationSummary(lead = {}) {
  const summary = lead.salesSummary?.conversation?.summary || lead.conversationSummary;
  if (summary) return summary;
  const messages = Array.isArray(lead.conversation) ? lead.conversation : [];
  const questions = messages
    .filter((item) => item?.role === "customer")
    .map((item) => String(item.text || "").trim())
    .filter(Boolean)
    .slice(-3);
  return questions.length
    ? `Recent customer questions: ${questions.join(" | ")}.`
    : "The customer completed the ConnectIQ qualification flow. Review the profile and recommendation before outreach.";
}

export function leadHealth(lead = {}) {
  const customer = leadCustomer(lead);
  const household = leadHousehold(lead);
  const recommendation = leadRecommendation(lead);
  const missing = [];
  if (customer.name === "Unknown Customer") missing.push("customer name");
  if (customer.email === "Not captured") missing.push("email");
  if (customer.phone === "Not captured") missing.push("phone");
  if (customer.address === "No service address captured") missing.push("service address");
  if (!household.people) missing.push("household size");
  if (!household.devices) missing.push("device count");
  if (!household.budget) missing.push("budget");
  if (recommendation.provider === "Recommendation pending") missing.push("provider recommendation");
  if (recommendation.plan === "Plan pending") missing.push("plan recommendation");
  const score = Math.max(0, 100 - missing.length * 10);
  return { score, missing };
}

export function buildLeadTimeline(lead = {}) {
  const events = [];
  const created = asDate(lead.createdAt || lead.updatedAt);
  if (created) events.push({ id: "lead-created", type: "lead_created", title: "Lead created", detail: "Customer opportunity entered ConnectIQ.", date: created, createdBy: null, metadata: {} });
  if (lead.recommendationSnapshot || lead.recommendedProvider || lead.salesSummary?.recommendation) {
    events.push({ id: "recommendation-generated", type: "recommendation_generated", title: "Recommendation generated", detail: `${providerName(lead)} was selected as the best fit.`, date: asDate(lead.recommendedAt) || created, createdBy: null, metadata: {} });
  }
  if (lead.quote || lead.salesSummary?.quote) {
    events.push({ id: "quote-generated", type: "quote_generated", title: "Quote generated", detail: `${planName(lead)} prepared for advisor review.`, date: asDate(lead.quote?.generatedAt || lead.salesSummary?.generatedAt) || created, createdBy: null, metadata: {} });
  }

  const journal = Array.isArray(lead.opportunityJournal) ? lead.opportunityJournal : [];
  journal.forEach((item, index) => {
    events.push({
      id: item.id || `journal-${index}`,
      type: item.type || "advisor_activity",
      title: item.title || item.status || item.type || "Advisor activity",
      detail: item.description || item.note || "Lead updated.",
      date: asDate(item.createdAt),
      createdBy: item.createdBy || (item.createdByName ? { name: item.createdByName } : null),
      metadata: item.metadata || {},
    });
  });

  (lead.activity || []).forEach((item, index) => {
    events.push({
      id: item.id || `legacy-activity-${index}`,
      type: item.status || item.type || "advisor_activity",
      title: item.title || item.status || item.type || "Advisor activity",
      detail: item.description || item.note || "Lead updated.",
      date: asDate(item.createdAt),
      createdBy: item.createdBy || null,
      metadata: item.metadata || {},
    });
  });

  return events
    .filter((event) => event.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function buildLeadWorkspace(lead = {}) {
  const health = leadHealth(lead);
  return {
    id: lead.id || "",
    customer: leadCustomer(lead),
    household: leadHousehold(lead),
    recommendation: leadRecommendation(lead),
    coaching: leadCoaching(lead),
    conversationSummary: leadConversationSummary(lead),
    timeline: buildLeadTimeline(lead),
    status: leadStatus(lead),
    quality: leadQuality(lead),
    readiness: readinessScore(lead),
    health,
    advisorNotes: text(lead.advisorNotes, ""),
    followUpDate: lead.followUpDate || "",
  };
}
