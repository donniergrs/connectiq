import { asDate, monthlyPrice, projectedCommission, providerName } from "./advisorDashboard.js";
import { buildSalesCoach } from "./aiSalesIntelligence.js";
import { normalizePipelineLead } from "../domains/lead/pipeline/pipelineService.js";

const ACTIVE_STAGES = new Set(["new", "contacted", "qualified", "quoted", "order-submitted", "installation-scheduled"]);
const WON_STATUSES = new Set(["installed", "sale closed", "sold", "commission paid", "closed won"]);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function monthKey(value) {
  const date = asDate(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "";
}

function closedDate(lead = {}) {
  return asDate(lead.closedDate || lead.installedAt || lead.soldAt || lead.completedAt || lead.updatedAt || lead.createdAt);
}

function isWon(lead = {}) {
  const status = String(lead.status || lead.currentStatus || lead.readinessStatus || "").trim().toLowerCase();
  return WON_STATUSES.has(status) || normalizePipelineLead(lead).stageId === "installed";
}

function advisorIdentity(lead = {}) {
  return {
    id: lead.assignedAdvisor?.uid || lead.assignedAdvisorUid || lead.assignedAdvisor?.email || lead.assignedAdvisorEmail || lead.ownerName || "unassigned",
    name: lead.assignedAdvisor?.name || lead.assignedAdvisorName || lead.ownerName || lead.assignedTo || "Unassigned",
  };
}

function leadCommission(lead = {}) {
  return number(
    lead.closedCommission ??
    lead.expectedCommission ??
    lead.commission ??
    lead.salesSummary?.advisorNotes?.projectedCommission ??
    projectedCommission(lead),
  );
}

export function buildFinancialMetrics(leads = [], options = {}) {
  const now = options.now || new Date();
  const goalMRR = Math.max(0, number(options.goalMRR, 50000));
  const currentMonth = monthKey(now);
  const normalized = leads.map((lead) => ({ raw: lead, pipeline: normalizePipelineLead(lead) }));
  const active = normalized.filter(({ pipeline }) => ACTIVE_STAGES.has(pipeline.stageId));
  const wonThisMonth = normalized.filter(({ raw }) => isWon(raw) && monthKey(closedDate(raw)) === currentMonth);

  const pipelineMRR = active.reduce((sum, { raw }) => sum + monthlyPrice(raw), 0);
  const closedMRR = wonThisMonth.reduce((sum, { raw }) => sum + monthlyPrice(raw), 0);
  const weightedOpenMRR = Math.round(active.reduce((sum, { raw }) => sum + monthlyPrice(raw) * buildSalesCoach(raw, now).closeProbability / 100, 0));
  const forecastMRR = closedMRR + weightedOpenMRR;
  const arr = closedMRR * 12;
  const goalAchievement = goalMRR ? Math.round((closedMRR / goalMRR) * 1000) / 10 : 0;
  const forecastAchievement = goalMRR ? Math.round((forecastMRR / goalMRR) * 1000) / 10 : 0;
  const remainingToGoal = Math.max(0, goalMRR - closedMRR);
  const closedCommission = wonThisMonth.reduce((sum, { raw }) => sum + leadCommission(raw), 0);
  const forecastCommission = Math.round(active.reduce((sum, { raw }) => sum + leadCommission(raw) * buildSalesCoach(raw, now).closeProbability / 100, 0));

  return {
    currentMonth,
    pipelineMRR,
    forecastMRR,
    closedMRR,
    arr,
    goalMRR,
    goalAchievement,
    forecastAchievement,
    remainingToGoal,
    closedCommission,
    forecastCommission,
    goalStatus: forecastMRR >= goalMRR ? "Ahead of Plan" : "Behind Plan",
    wonCount: wonThisMonth.length,
    activeCount: active.length,
  };
}

export function buildAdvisorRevenueLeaderboard(leads = [], now = new Date()) {
  const rows = new Map();
  leads.forEach((lead) => {
    const advisor = advisorIdentity(lead);
    const row = rows.get(advisor.id) || { ...advisor, pipelineMRR: 0, forecastMRR: 0, closedMRR: 0, closedDeals: 0, totalDeals: 0 };
    const item = normalizePipelineLead(lead);
    const mrr = monthlyPrice(lead);
    row.totalDeals += 1;
    if (ACTIVE_STAGES.has(item.stageId)) {
      row.pipelineMRR += mrr;
      row.forecastMRR += mrr * buildSalesCoach(lead, now).closeProbability / 100;
    }
    if (isWon(lead) && monthKey(closedDate(lead)) === monthKey(now)) {
      row.closedMRR += mrr;
      row.closedDeals += 1;
    }
    rows.set(advisor.id, row);
  });
  return [...rows.values()].map((row) => ({
    ...row,
    forecastMRR: Math.round(row.forecastMRR),
    winRate: row.totalDeals ? Math.round((row.closedDeals / row.totalDeals) * 100) : 0,
    averageMRR: row.closedDeals ? Math.round(row.closedMRR / row.closedDeals) : 0,
  })).sort((a, b) => b.closedMRR - a.closedMRR || b.forecastMRR - a.forecastMRR);
}

export function buildCarrierRevenue(leads = [], now = new Date()) {
  const rows = new Map();
  leads.forEach((lead) => {
    const carrier = providerName(lead);
    const row = rows.get(carrier) || { carrier, pipelineMRR: 0, forecastMRR: 0, closedMRR: 0, commission: 0, total: 0, won: 0 };
    const item = normalizePipelineLead(lead);
    const mrr = monthlyPrice(lead);
    row.total += 1;
    if (ACTIVE_STAGES.has(item.stageId)) {
      row.pipelineMRR += mrr;
      row.forecastMRR += mrr * buildSalesCoach(lead, now).closeProbability / 100;
    }
    if (isWon(lead) && monthKey(closedDate(lead)) === monthKey(now)) {
      row.closedMRR += mrr;
      row.commission += leadCommission(lead);
      row.won += 1;
    }
    rows.set(carrier, row);
  });
  return [...rows.values()].map((row) => ({
    ...row,
    forecastMRR: Math.round(row.forecastMRR),
    conversionRate: row.total ? Math.round((row.won / row.total) * 100) : 0,
  })).sort((a, b) => b.closedMRR - a.closedMRR || b.pipelineMRR - a.pipelineMRR);
}

export function buildMonthlyRevenueTrend(leads = [], months = 6, now = new Date()) {
  const buckets = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({ key: monthKey(date), label: date.toLocaleString("en-US", { month: "short" }), closedMRR: 0, commission: 0 });
  }
  const lookup = new Map(buckets.map((item) => [item.key, item]));
  leads.forEach((lead) => {
    if (!isWon(lead)) return;
    const bucket = lookup.get(monthKey(closedDate(lead)));
    if (!bucket) return;
    bucket.closedMRR += monthlyPrice(lead);
    bucket.commission += leadCommission(lead);
  });
  return buckets;
}

export function buildExecutiveBriefing(financials, advisorRows = [], carrierRows = [], intelligence = {}) {
  const topAdvisor = advisorRows[0];
  const topCarrier = carrierRows[0];
  const items = [
    `Closed MRR is $${Math.round(financials.closedMRR).toLocaleString()} against a $${Math.round(financials.goalMRR).toLocaleString()} monthly goal (${financials.goalAchievement}% complete).`,
    `Probability-weighted forecast MRR is $${Math.round(financials.forecastMRR).toLocaleString()}, placing the business ${financials.goalStatus.toLowerCase()}.`,
  ];
  if (topAdvisor) items.push(`${topAdvisor.name} leads advisor revenue with $${Math.round(topAdvisor.closedMRR).toLocaleString()} closed MRR this month.`);
  if (topCarrier) items.push(`${topCarrier.carrier} currently contributes the most closed carrier MRR at $${Math.round(topCarrier.closedMRR).toLocaleString()}.`);
  if (intelligence.overdue) items.push(`${intelligence.overdue} overdue follow-up${intelligence.overdue === 1 ? "" : "s"} require immediate attention.`);
  if (financials.remainingToGoal > 0) items.push(`The team needs $${Math.round(financials.remainingToGoal).toLocaleString()} in additional closed MRR to reach the monthly goal.`);
  return items;
}
