import test from "node:test";
import assert from "node:assert/strict";
import { buildAdvisorDashboard, normalizeLead, isReadyToCall } from "../src/services/advisorDashboard.js";

const baseLead = {
  id: "lead-1",
  name: "Jordan Smith",
  createdAt: "2026-07-13T14:00:00.000Z",
  status: "Ready to Submit",
  readinessScore: 95,
  leadQuality: "High Opportunity",
  recommendedProvider: "AT&T Fiber",
  quote: { productName: "Fiber 1 Gig", monthlyPrice: 85 },
  providers: [{ commission: 250 }],
};

test("normalizes v0.4 sales data for the advisor workspace", () => {
  const lead = normalizeLead(baseLead);
  assert.equal(lead.provider, "AT&T Fiber");
  assert.equal(lead.plan, "Fiber 1 Gig");
  assert.equal(lead.monthlyPrice, 85);
  assert.equal(lead.readiness, 95);
  assert.equal(lead.commission, 250);
});

test("marks qualified high-readiness leads ready to call", () => {
  assert.equal(isReadyToCall(baseLead), true);
  assert.equal(isReadyToCall({ status: "New Lead", readinessScore: 45 }), false);
});

test("builds advisor dashboard metrics and priority queue", () => {
  const result = buildAdvisorDashboard([
    baseLead,
    { ...baseLead, id: "lead-2", status: "Installed", readinessScore: 80, leadQuality: "Medium Opportunity", providers: [{ commission: 100 }] },
  ], new Date("2026-07-13T18:00:00.000Z"));

  assert.equal(result.metrics.total, 2);
  assert.equal(result.metrics.today, 2);
  assert.equal(result.metrics.readyToCall, 1);
  assert.equal(result.metrics.quotesGenerated, 2);
  assert.equal(result.metrics.closed, 1);
  assert.equal(result.metrics.projectedCommission, 350);
  assert.equal(result.priorityQueue[0].id, "lead-1");
});

test("supports nested sales summary records", () => {
  const lead = normalizeLead({
    salesSummary: {
      recommendation: { provider: "Lumos Fiber", plan: "Fiber 500" },
      quote: { monthlyPrice: 70 },
      advisorNotes: { readinessScore: 92, leadQuality: "High Opportunity", nextAction: "Call customer" },
    },
  });
  assert.equal(lead.provider, "Lumos Fiber");
  assert.equal(lead.plan, "Fiber 500");
  assert.equal(lead.monthlyPrice, 70);
  assert.equal(lead.action, "Call customer");
});
