import test from "node:test";
import assert from "node:assert/strict";
import { buildCompletionQueue, evaluateCompletion } from "../src/services/completionService.js";

const readyLead = {
  customerName: "Taylor",
  address: "101 Main St",
  phone: "555-0100",
  currentProvider: "Spectrum",
  monthlyBill: 115,
  painPoints: ["lower bill"],
  availableProviders: [{ name: "AT&T Fiber" }],
  recommendedProvider: "AT&T Fiber",
  quoteId: "q1",
  orderReadinessScore: 100,
  status: "Submitted",
};

test("completion passes only when every production gate passes", () => {
  const result = evaluateCompletion(readyLead);
  assert.equal(result.complete, true);
  assert.equal(result.readiness, 100);
  assert.equal(result.blockers.length, 0);
});

test("submission remains required even when OrderIQ is ready", () => {
  const result = evaluateCompletion({ ...readyLead, status: "Order Ready" });
  assert.equal(result.complete, false);
  assert.equal(result.blockers[0].id, "submission");
});

test("missing verified availability blocks completion", () => {
  const result = evaluateCompletion({ ...readyLead, availableProviders: [] });
  assert.ok(result.blockers.some((gate) => gate.id === "availability"));
});

test("do-not-contact status fails the consent gate", () => {
  const result = evaluateCompletion({ ...readyLead, status: "Do Not Contact" });
  assert.ok(result.blockers.some((gate) => gate.id === "consent"));
});

test("next action targets the earliest missing gate", () => {
  const result = evaluateCompletion({ customerName: "Taylor" });
  assert.equal(result.nextAction, "Complete the customer profile");
});

test("queue prioritizes high-readiness incomplete transactions", () => {
  const result = buildCompletionQueue([
    { id: "low", customerName: "Low" },
    { id: "high", ...readyLead, status: "Order Ready" },
    { id: "done", ...readyLead },
  ]);
  assert.equal(result.queue[0].id, "high");
  assert.equal(result.queue.at(-1).id, "done");
  assert.equal(result.metrics.complete, 1);
});
