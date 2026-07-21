import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesIQ, calculateOpportunityScore, determineSalesStage, selectSalesPlaybook } from "../src/services/salesIQService.js";

test("SalesIQ selects the lower-bill playbook", () => {
  assert.equal(selectSalesPlaybook({ painPoints: ["My bill is too expensive"] }).id, "lower-bill");
});

test("SalesIQ advances quoted customers to follow-up", () => {
  assert.equal(determineSalesStage({ quoteId: "quote-1" }), "FOLLOW_UP");
});

test("SalesIQ gives complete opportunities a higher score", () => {
  const complete = calculateOpportunityScore({ phone: "8645551212", serviceAddress: "1 Main St", currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["lower bill"], recommendedProvider: "AT&T Fiber", quoteId: "q1" });
  const empty = calculateOpportunityScore({});
  assert.ok(complete.score > empty.score);
  assert.ok(complete.score >= 70);
});

test("SalesIQ prioritizes hot opportunities", () => {
  const result = buildSalesIQ([{ id: "cold" }, { id: "hot", phone: "1", address: "x", currentProvider: "Spectrum", monthlyBill: 100, painPoints: ["save"], recommendedProvider: "FiberCo", quoteId: "q1" }]);
  assert.equal(result.queue[0].id, "hot");
  assert.equal(result.metrics.hot, 1);
});
