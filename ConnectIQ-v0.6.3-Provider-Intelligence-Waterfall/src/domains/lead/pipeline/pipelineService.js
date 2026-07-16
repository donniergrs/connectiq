import { asDate, normalizeLead } from "../../../services/advisorDashboard.js";
import { leadHealth } from "../../../services/leadWorkspace.js";

export const PIPELINE_STAGES = [
  { id: "new", label: "New", statuses: ["New", "New Lead", "Ready for Advisor", "Qualified — Verify Offer"] },
  { id: "contacted", label: "Contacted", statuses: ["Contacted", "Attempted Contact", "Follow-up Required"] },
  { id: "qualified", label: "Qualified", statuses: ["Qualified", "Sales Qualified"] },
  { id: "quoted", label: "Quoted", statuses: ["Quoted", "Quote Sent", "Proposal Sent"] },
  { id: "order-submitted", label: "Order Submitted", statuses: ["Order Submitted", "Submitted", "Ready to Submit"] },
  { id: "installation-scheduled", label: "Installation Scheduled", statuses: ["Installation Scheduled", "Install Scheduled"] },
  { id: "installed", label: "Installed", statuses: ["Installed", "Sale Closed", "Sold", "Commission Paid"] },
  { id: "closed", label: "Closed", statuses: ["Closed", "Closed Lost", "Cancelled", "Not Interested"] },
];

const STATUS_LOOKUP = new Map(
  PIPELINE_STAGES.flatMap((stage) => stage.statuses.map((status) => [status.toLowerCase(), stage.id]))
);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function pipelineStageId(lead = {}) {
  const status = String(lead.status || lead.currentStatus || lead.readinessStatus || "New Lead").trim().toLowerCase();
  return STATUS_LOOKUP.get(status) || "new";
}

export function leadOwner(lead = {}) {
  return (
    lead.assignedAdvisor?.name ||
    lead.assignedAdvisorName ||
    lead.ownerName ||
    lead.assignedTo ||
    "Unassigned"
  );
}

export function followUpDate(lead = {}) {
  return asDate(lead.followUpDate || lead.nextFollowUp || lead.followUp?.scheduledFor);
}

export function lastActivityDate(lead = {}) {
  const journal = Array.isArray(lead.opportunityJournal) ? lead.opportunityJournal : [];
  const activity = Array.isArray(lead.activity) ? lead.activity : [];
  const dates = [...journal, ...activity]
    .map((event) => asDate(event.createdAt || event.updatedAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] || asDate(lead.updatedAt) || asDate(lead.createdAt);
}

export function normalizePipelineLead(lead = {}) {
  const normalized = normalizeLead(lead);
  const health = leadHealth(lead);
  return {
    ...normalized,
    stageId: pipelineStageId(lead),
    health: health.score,
    missing: health.missing,
    owner: leadOwner(lead),
    followUpDate: followUpDate(lead),
    lastActivityDate: lastActivityDate(lead),
    matchScore: number(
      lead.salesSummary?.recommendation?.matchScore ??
      lead.recommendationSnapshot?.advisorScore ??
      lead.quote?.advisorScore
    ),
  };
}

export function buildLeadPipeline(leads = []) {
  const normalized = leads.map(normalizePipelineLead);
  const stages = PIPELINE_STAGES.map((stage) => {
    const stageLeads = normalized
      .filter((lead) => lead.stageId === stage.id)
      .sort((a, b) => {
        if (b.readiness !== a.readiness) return b.readiness - a.readiness;
        return (b.lastActivityDate?.getTime?.() || 0) - (a.lastActivityDate?.getTime?.() || 0);
      });
    return {
      ...stage,
      leads: stageLeads,
      count: stageLeads.length,
      monthlyRevenue: stageLeads.reduce((sum, lead) => sum + number(lead.monthlyPrice), 0),
    };
  });

  const totalMonthlyRevenue = normalized.reduce((sum, lead) => sum + number(lead.monthlyPrice), 0);
  const averageMatch = normalized.length
    ? Math.round(normalized.reduce((sum, lead) => sum + number(lead.matchScore), 0) / normalized.length)
    : 0;
  const now = Date.now();
  const needsFollowUp = normalized.filter((lead) => {
    if (!lead.followUpDate) return false;
    return lead.followUpDate.getTime() <= now;
  }).length;

  return {
    leads: normalized,
    stages,
    metrics: {
      totalLeads: normalized.length,
      totalMonthlyRevenue,
      averageMatch,
      needsFollowUp,
    },
  };
}
