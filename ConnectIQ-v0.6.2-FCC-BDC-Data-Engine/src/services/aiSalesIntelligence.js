import { asDate } from "./advisorDashboard.js";
import { buildPriorityQueue, leadPriority } from "./priorityEngine.js";
import { normalizePipelineLead } from "../domains/lead/pipeline/pipelineService.js";

const ACTIVE_STAGES = new Set(["new", "contacted", "qualified", "quoted", "order-submitted", "installation-scheduled"]);

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function daysBetween(earlier, later = new Date()) {
  const date = asDate(earlier);
  return date ? Math.max(0, (later.getTime() - date.getTime()) / 86400000) : 0;
}

function leadSignals(lead = {}, now = new Date()) {
  const item = normalizePipelineLead(lead);
  const priority = leadPriority(lead, now);
  const followUpOverdue = Boolean(item.followUpDate && item.followUpDate <= now);
  const inactivityDays = Math.round(daysBetween(item.lastActivityDate, now));
  const ageDays = Math.round(daysBetween(lead.createdAt, now));
  return { item, priority, followUpOverdue, inactivityDays, ageDays };
}

export function buildSalesCoach(lead = {}, now = new Date()) {
  const { item, priority, followUpOverdue, inactivityDays, ageDays } = leadSignals(lead, now);
  const fit = clamp(item.matchScore);
  const readiness = clamp(item.readiness);
  const stageBonus = { new: 2, contacted: 5, qualified: 10, quoted: 14, "order-submitted": 8, "installation-scheduled": 4 }[item.stageId] || 0;
  const closeProbability = Math.round(clamp(readiness * 0.46 + fit * 0.32 + stageBonus - Math.min(18, inactivityDays * 1.5) - (followUpOverdue ? 4 : 0), 5, 96));

  let likelyObjection = "Unclear value or timing";
  let suggestedResponse = "Confirm the customer’s top priority, then connect the recommendation directly to that need.";
  if (item.monthlyPrice >= 100) {
    likelyObjection = "Monthly price";
    suggestedResponse = "Frame the monthly cost against reliability, included speed, and the cost of staying with an underperforming service.";
  } else if (/cable|wireless|satellite/i.test(item.technology || "")) {
    likelyObjection = "Reliability or technology concerns";
    suggestedResponse = "Set clear expectations about the available technology and explain why this option is still the best fit at the address.";
  } else if (fit >= 85) {
    likelyObjection = "Need to compare alternatives";
    suggestedResponse = "Lead with the strongest fit factors and briefly compare the next-best option without overpromising.";
  }

  let nextAction = "Review the customer profile and make first contact.";
  let contactWindow = "Today";
  if (followUpOverdue) {
    nextAction = "Complete the overdue follow-up now and confirm whether the customer is ready to proceed.";
    contactWindow = "Immediate";
  } else if (item.followUpDate) {
    nextAction = "Prepare for the scheduled follow-up with the recommendation and quote open.";
    contactWindow = item.followUpDate.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  } else if (item.stageId === "quoted") {
    nextAction = "Confirm the quote was received and ask for the decision or remaining concern.";
    contactWindow = "Within 24 hours";
  } else if (inactivityDays >= 5) {
    nextAction = "Re-engage the customer before the opportunity goes cold.";
    contactWindow = "Today";
  }

  const evidence = [
    `${readiness}% readiness`,
    `${fit}% provider match`,
    `${priority.priorityScore}/100 work priority`,
    item.monthlyPrice ? `$${Math.round(item.monthlyPrice)}/mo estimated value` : null,
    followUpOverdue ? "Follow-up is overdue" : null,
    inactivityDays ? `${inactivityDays} days since activity` : "Recent activity",
  ].filter(Boolean);

  const confidence = Math.round(clamp(45 + Math.abs(readiness - 50) * 0.35 + Math.abs(fit - 50) * 0.25 + (evidence.length >= 5 ? 8 : 0), 45, 95));

  return {
    closeProbability,
    confidence,
    likelyObjection,
    suggestedResponse,
    nextAction,
    contactWindow,
    riskLevel: inactivityDays >= 10 || (followUpOverdue && inactivityDays >= 5) ? "High" : inactivityDays >= 5 || followUpOverdue ? "Medium" : "Low",
    evidence,
    priorityScore: priority.priorityScore,
    priorityReasons: priority.priorityReasons,
    ageDays,
    inactivityDays,
  };
}

export function buildMyDay(leads = [], advisor = null, now = new Date()) {
  const uid = advisor?.uid || "";
  const email = String(advisor?.email || "").toLowerCase();
  const owned = leads.filter((lead) => {
    const assigned = lead.assignedAdvisor || {};
    if (!uid && !email) return true;
    return assigned.uid === uid || lead.assignedAdvisorUid === uid || String(assigned.email || lead.assignedAdvisorEmail || "").toLowerCase() === email;
  });
  const active = owned.map((lead) => normalizePipelineLead(lead)).filter((lead) => ACTIVE_STAGES.has(lead.stageId));
  const queue = buildPriorityQueue(owned, 12);
  const todayKey = now.toISOString().slice(0, 10);
  const dueToday = active.filter((lead) => lead.followUpDate?.toISOString().slice(0, 10) === todayKey).length;
  const overdue = active.filter((lead) => lead.followUpDate && lead.followUpDate < now).length;
  const newAssigned = owned.filter((lead) => daysBetween(lead.assignedAt || lead.createdAt, now) < 1).length;
  const highPriority = queue.filter((lead) => lead.priorityScore >= 70).length;
  const pipelineValue = active.reduce((sum, lead) => sum + (lead.monthlyPrice || 0), 0);
  const forecastMRR = Math.round(owned.reduce((sum, lead) => {
    const normalized = normalizePipelineLead(lead);
    if (!ACTIVE_STAGES.has(normalized.stageId)) return sum;
    return sum + (normalized.monthlyPrice || 0) * (buildSalesCoach(lead, now).closeProbability / 100);
  }, 0));
  return { ownedCount: owned.length, dueToday, overdue, newAssigned, highPriority, pipelineValue, forecastMRR, queue };
}

export function buildExecutiveIntelligence(leads = [], advisors = [], now = new Date()) {
  const normalized = leads.map((lead) => normalizePipelineLead(lead));
  const active = normalized.filter((lead) => ACTIVE_STAGES.has(lead.stageId));
  const pipelineMRR = active.reduce((sum, lead) => sum + (lead.monthlyPrice || 0), 0);
  const forecastMRR = Math.round(leads.reduce((sum, lead) => {
    const item = normalizePipelineLead(lead);
    return ACTIVE_STAGES.has(item.stageId) ? sum + (item.monthlyPrice || 0) * buildSalesCoach(lead, now).closeProbability / 100 : sum;
  }, 0));
  const stale = normalized.filter((lead) => ACTIVE_STAGES.has(lead.stageId) && daysBetween(lead.lastActivityDate, now) >= 7).length;
  const overdue = normalized.filter((lead) => lead.followUpDate && lead.followUpDate < now && ACTIVE_STAGES.has(lead.stageId)).length;
  const installed = normalized.filter((lead) => lead.stageId === "installed").length;
  const closed = normalized.filter((lead) => lead.stageId === "closed").length;
  const conversionRate = leads.length ? Math.round((installed / leads.length) * 100) : 0;

  const workload = advisors.map((advisor) => {
    const advisorId = advisor.uid || advisor.id;
    const assigned = normalized.filter((lead) => lead.assignedAdvisor?.uid === advisorId || lead.assignedAdvisorUid === advisorId || lead.owner === advisor.name).filter((lead) => ACTIVE_STAGES.has(lead.stageId)).length;
    const capacity = Number(advisor.capacity || 0);
    return { ...advisor, assigned, capacity, utilization: capacity ? Math.round((assigned / capacity) * 100) : 0 };
  }).sort((a, b) => b.utilization - a.utilization);

  const recommendations = [];
  if (overdue) recommendations.push({ severity: "high", title: `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}`, action: "Prioritize these opportunities in My Day before assigning new work." });
  if (stale) recommendations.push({ severity: "medium", title: `${stale} stale active lead${stale === 1 ? "" : "s"}`, action: "Create a re-engagement task or reassign leads with no activity for seven days." });
  const overloaded = workload.filter((advisor) => advisor.capacity && advisor.utilization >= 90);
  if (overloaded.length) recommendations.push({ severity: "high", title: `${overloaded.length} advisor${overloaded.length === 1 ? " is" : "s are"} near capacity`, action: "Use capacity-balanced distribution before adding more work." });
  if (!recommendations.length) recommendations.push({ severity: "low", title: "Sales operations are balanced", action: "Continue working the highest-priority leads and monitor follow-up completion." });

  return { totalLeads: leads.length, activeLeads: active.length, pipelineMRR, forecastMRR, stale, overdue, installed, closed, conversionRate, workload, recommendations };
}
