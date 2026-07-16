import test from "node:test";
import assert from "node:assert/strict";
import { buildImportExecutionPlan } from "../src/services/importExecution.js";
import { buildCommissionMetrics } from "../src/services/revenueModels.js";
import { normalizeOrder } from "../src/services/revenueModels.js";

test("large imports defer provider enrichment and use checkpoints", () => {
  const plan = buildImportExecutionPlan(9600);
  assert.equal(plan.deferEnrichment, true);
  assert.equal(plan.chunkSize, 100);
});

test("small imports can enrich immediately", () => {
  assert.equal(buildImportExecutionPlan(100).deferEnrichment, false);
});

test("commission metrics separate forecast earned and paid", () => {
  const metrics = buildCommissionMetrics([
    { amount: 100, status: "Forecast" },
    { amount: 200, status: "Earned" },
    { amount: 300, status: "Paid" },
  ]);
  assert.equal(metrics.forecast, 100);
  assert.equal(metrics.earned, 200);
  assert.equal(metrics.paid, 300);
  assert.equal(metrics.total, 600);
});

test("orders default safely to Draft", () => {
  const order = normalizeOrder({ customerName: "Test", status: "Unknown" });
  assert.equal(order.status, "Draft");
});
