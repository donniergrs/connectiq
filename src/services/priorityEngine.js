import { asDate } from "./advisorDashboard.js";
import { normalizePipelineLead } from "../domains/lead/pipeline/pipelineService.js";

const STAGE_POINTS = { new: 5, contacted: 7, qualified: 8, quoted: 9, "order-submitted": 4, "installation-scheduled": 2, installed: 0, closed: 0 };
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function daysSince(date) { if (!date) return 0; return Math.max(0, (Date.now() - date.getTime()) / 86400000); }

export function leadPriority(lead = {}, now = new Date()) {
  const item = normalizePipelineLead(lead);
  const followUp = item.followUpDate;
  const overdueDays = followUp ? Math.max(0, (now.getTime() - followUp.getTime()) / 86400000) : 0;
  const followUpScore = followUp && followUp <= now ? clamp(18 + overdueDays * 4, 0, 30) : 0;
  const readinessScore = clamp((item.readiness || 0) * 0.25, 0, 25);
  const matchScore = clamp((item.matchScore || 0) * 0.15, 0, 15);
  const mrrScore = clamp((item.monthlyPrice || 0) / 20, 0, 10);
  const inactivityScore = clamp(daysSince(item.lastActivityDate), 0, 10);
  const created = asDate(lead.createdAt);
  const ageScore = clamp(daysSince(created) / 2, 0, 5);
  const stageScore = STAGE_POINTS[item.stageId] || 0;
  const score = Math.round(clamp(followUpScore + readinessScore + matchScore + mrrScore + inactivityScore + ageScore + stageScore, 0, 100));
  const reasons = [];
  if (followUpScore) reasons.push("Follow-up overdue");
  if ((item.readiness || 0) >= 80) reasons.push("High readiness");
  if ((item.matchScore || 0) >= 85) reasons.push("Strong provider match");
  if ((item.monthlyPrice || 0) >= 100) reasons.push("High-value opportunity");
  if (inactivityScore >= 5) reasons.push("Needs advisor activity");
  return { ...item, priorityScore: score, priorityReasons: reasons.length ? reasons : ["Best available opportunity"] };
}

export function buildPriorityQueue(leads = [], limit = 10) {
  return leads.map((lead) => leadPriority(lead)).filter((lead) => !["installed", "closed"].includes(lead.stageId)).sort((a, b) => b.priorityScore - a.priorityScore || b.readiness - a.readiness).slice(0, limit);
}
