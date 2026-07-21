import test from "node:test";
import assert from "node:assert/strict";
import { buildAgentPlan, buildCustomerState, buildOrchestrationQueue, selectOrchestrationAgent } from "../src/services/brainOrchestrationService.js";

test("discovery is selected when customer facts are missing", () => {
  const result = selectOrchestrationAgent({ customerName: "Taylor" });
  assert.equal(result.agent.id, "discovery");
  assert.ok(result.state.missing.includes("service address"));
});

test("availability is selected when address exists but provider results are missing", () => {
  const result = selectOrchestrationAgent({ address: "101 Main St", currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["lower bill"] });
  assert.equal(result.agent.id, "availability");
});

test("recommendation is selected after discovery and availability", () => {
  const result = selectOrchestrationAgent({ address: "101 Main St", currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["lower bill"], availableProviders: [{ name: "AT&T Fiber" }] });
  assert.equal(result.agent.id, "recommendation");
});

test("quote agent is selected after recommendation", () => {
  const result = selectOrchestrationAgent({ address: "101 Main St", currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["lower bill"], availableProviders: [{ name: "AT&T Fiber" }], recommendedProvider: "AT&T Fiber" });
  assert.equal(result.agent.id, "quote");
});

test("order agent is selected after quote and before full readiness", () => {
  const result = selectOrchestrationAgent({ address: "101 Main St", currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["lower bill"], availableProviders: [{ name: "AT&T Fiber" }], recommendedProvider: "AT&T Fiber", quoteId: "q1", orderReadinessScore: 70 });
  assert.equal(result.agent.id, "order");
});

test("human advisor overrides automation for do-not-contact leads", () => {
  const result = selectOrchestrationAgent({ status: "Do Not Contact", address: "101 Main St" });
  assert.equal(result.agent.id, "human");
  assert.equal(result.confidence, 0.99);
});

test("agent plan exposes safeguards and an active next action", () => {
  const result = buildAgentPlan({ address: "101 Main St" });
  assert.ok(result.safeguards.length >= 4);
  assert.ok(result.nextAction);
  assert.ok(result.steps.some((step) => step.status === "ACTIVE"));
});

test("customer completeness reaches 100 when all core facts are present", () => {
  const result = buildCustomerState({ customerName: "Taylor", address: "101 Main St", phone: "555-0100", currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["reliability"], availableProviders: [{ name: "Lumos" }] });
  assert.equal(result.completeness, 100);
});

test("queue prioritizes human escalations", () => {
  const result = buildOrchestrationQueue([{ id: "a", customerName: "Normal" }, { id: "b", customerName: "Escalate", status: "Do Not Contact" }]);
  assert.equal(result.queue[0].id, "b");
  assert.equal(result.metrics.humanEscalations, 1);
});
