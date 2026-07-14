import test from "node:test";
import assert from "node:assert/strict";
import { buildAdvisorRevenueLeaderboard, buildCarrierRevenue, buildExecutiveBriefing, buildFinancialMetrics, buildMonthlyRevenueTrend } from "../src/services/financialMetricsService.js";

const now = new Date("2026-07-20T12:00:00Z");
const leads = [
  { id: "a", status: "Installed", closedDate: "2026-07-10T12:00:00Z", assignedAdvisor: { uid: "one", name: "Sarah" }, recommendedProvider: "FiberCo", quote: { monthlyPrice: 100 }, expectedCommission: 250 },
  { id: "b", status: "Sold", closedDate: "2026-07-12T12:00:00Z", assignedAdvisor: { uid: "two", name: "Mike" }, recommendedProvider: "CableCo", quote: { monthlyPrice: 80 }, expectedCommission: 180 },
  { id: "c", status: "Qualified", createdAt: "2026-07-18T12:00:00Z", assignedAdvisor: { uid: "one", name: "Sarah" }, recommendedProvider: "FiberCo", quote: { monthlyPrice: 120 }, salesSummary: { readiness: { score: 90 }, recommendation: { matchScore: 92 } }, expectedCommission: 300 },
  { id: "d", status: "Closed Lost", closedDate: "2026-07-14T12:00:00Z", assignedAdvisor: { uid: "one", name: "Sarah" }, recommendedProvider: "FiberCo", quote: { monthlyPrice: 70 } },
  { id: "e", status: "Installed", closedDate: "2026-06-15T12:00:00Z", assignedAdvisor: { uid: "one", name: "Sarah" }, recommendedProvider: "FiberCo", quote: { monthlyPrice: 90 }, expectedCommission: 200 },
];

test("financial metrics calculate closed MRR for the current month only", () => {
  const metrics = buildFinancialMetrics(leads, { now, goalMRR: 500 });
  assert.equal(metrics.closedMRR, 180);
  assert.equal(metrics.arr, 2160);
  assert.equal(metrics.goalAchievement, 36);
  assert.equal(metrics.remainingToGoal, 320);
  assert.equal(metrics.closedCommission, 430);
});

test("forecast MRR uses active opportunities and remains separate from closed MRR", () => {
  const metrics = buildFinancialMetrics(leads, { now, goalMRR: 100 });
  assert.ok(metrics.forecastMRR > 0);
  assert.equal(metrics.pipelineMRR, 120);
  assert.equal(metrics.closedMRR, 180);
  assert.equal(metrics.goalStatus, "Ahead of Plan");
});

test("advisor leaderboard ranks current-month closed revenue", () => {
  const rows = buildAdvisorRevenueLeaderboard(leads, now);
  assert.equal(rows[0].name, "Sarah");
  assert.equal(rows[0].closedMRR, 100);
  assert.ok(rows[0].forecastMRR > 0);
});

test("carrier performance separates pipeline forecast and closed revenue", () => {
  const rows = buildCarrierRevenue(leads, now);
  const fiber = rows.find((row) => row.carrier === "FiberCo");
  assert.equal(fiber.closedMRR, 100);
  assert.equal(fiber.pipelineMRR, 120);
  assert.equal(fiber.commission, 250);
});

test("monthly trend includes prior closed revenue in the correct month", () => {
  const trend = buildMonthlyRevenueTrend(leads, 3, now);
  assert.equal(trend.find((item) => item.key === "2026-06").closedMRR, 90);
  assert.equal(trend.find((item) => item.key === "2026-07").closedMRR, 180);
});

test("executive briefing communicates goal progress and leading contributors", () => {
  const metrics = buildFinancialMetrics(leads, { now, goalMRR: 500 });
  const briefing = buildExecutiveBriefing(metrics, buildAdvisorRevenueLeaderboard(leads, now), buildCarrierRevenue(leads, now), { overdue: 2 });
  assert.ok(briefing.some((item) => item.includes("Closed MRR")));
  assert.ok(briefing.some((item) => item.includes("Sarah")));
  assert.ok(briefing.some((item) => item.includes("overdue")));
});
