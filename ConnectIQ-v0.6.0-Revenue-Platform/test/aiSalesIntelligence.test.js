import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutiveIntelligence, buildMyDay, buildSalesCoach } from "../src/services/aiSalesIntelligence.js";

const now = new Date("2026-07-14T16:00:00Z");
const strongLead = {
  id: "lead-1",
  name: "Jordan Customer",
  status: "Qualified",
  createdAt: new Date("2026-07-10T12:00:00Z"),
  lastActivityAt: new Date("2026-07-12T12:00:00Z"),
  followUpDate: "2026-07-13T15:00",
  assignedAdvisor: { uid: "advisor-1", email: "advisor@example.com" },
  salesSummary: {
    readiness: { score: 92 },
    recommendation: { provider: "FiberCo", plan: "Fiber 1 Gig", matchScore: 94 },
    quote: { monthlyPrice: 110 },
  },
  quote: { monthlyPrice: 110, technology: "Fiber" },
};

const lowerLead = {
  id: "lead-2",
  name: "Taylor Customer",
  status: "New",
  createdAt: new Date("2026-07-14T12:00:00Z"),
  lastActivityAt: new Date("2026-07-14T12:00:00Z"),
  assignedAdvisor: { uid: "advisor-1", email: "advisor@example.com" },
  salesSummary: {
    readiness: { score: 30 },
    recommendation: { provider: "CableCo", plan: "300 Mbps", matchScore: 55 },
    quote: { monthlyPrice: 55 },
  },
};

test("AI sales coach produces explainable bounded guidance", () => {
  const coach = buildSalesCoach(strongLead, now);
  assert.ok(coach.closeProbability >= 5 && coach.closeProbability <= 96);
  assert.ok(coach.confidence >= 45 && coach.confidence <= 95);
  assert.equal(coach.contactWindow, "Immediate");
  assert.ok(coach.evidence.some((item) => item.includes("readiness")));
  assert.ok(coach.nextAction.includes("overdue"));
});

test("My Day only includes the signed-in advisor's leads", () => {
  const other = { ...lowerLead, id: "lead-3", assignedAdvisor: { uid: "advisor-2", email: "other@example.com" } };
  const day = buildMyDay([strongLead, lowerLead, other], { uid: "advisor-1", email: "advisor@example.com" }, now);
  assert.equal(day.ownedCount, 2);
  assert.equal(day.overdue, 1);
  assert.equal(day.queue[0].id, "lead-1");
  assert.ok(day.forecastMRR >= 0);
});

test("Executive intelligence calculates forecast and management recommendations", () => {
  const intelligence = buildExecutiveIntelligence(
    [strongLead, lowerLead],
    [{ id: "advisor-1", name: "Advisor One", capacity: 1 }],
    now,
  );
  assert.equal(intelligence.totalLeads, 2);
  assert.ok(intelligence.forecastMRR <= intelligence.pipelineMRR);
  assert.equal(intelligence.workload[0].assigned, 2);
  assert.ok(intelligence.recommendations.some((item) => item.title.includes("capacity") || item.title.includes("overdue")));
});

test("Lower-readiness leads receive lower close probability", () => {
  assert.ok(buildSalesCoach(strongLead, now).closeProbability > buildSalesCoach(lowerLead, now).closeProbability);
});
