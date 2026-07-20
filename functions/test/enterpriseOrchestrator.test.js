import test from "node:test";
import assert from "node:assert/strict";
import { orchestrateEnterpriseResponse } from "../services/enterprise/orchestrator.js";

const providers = [
  { name: "AT&T Fiber", technology: "fiber", maxdown: 5000, maxup: 5000, lowlatency: true },
  { name: "Spectrum", technology: "cable", maxdown: 1000, maxup: 40 },
  { name: "Verizon", technology: "fixed wireless", maxdown: 300, maxup: 20 },
];
function router(memory = {}) { return { memory: { facts: {}, householdNeeds: [], preferences: [], rejectedProviders: [], ...memory }, orchestration: {} }; }

test("recommends from available providers using customer needs", () => {
  const result = orchestrateEnterpriseResponse({ message: "I work from home and want the best option", providers, routerResult: router({ facts: { currentProvider: "Spectrum", monthlyBill: 115 }, householdNeeds: ["workFromHome"], preferences: ["price"] }) });
  assert.equal(result.selectedProvider, "AT&T Fiber");
  assert.match(result.message, /leading option/i);
});

test("rejects a provider and presents alternatives", () => {
  const result = orchestrateEnterpriseResponse({ message: "I don't want AT&T. show me alternatives", providers, selectedProvider: "AT&T Fiber", routerResult: router({ facts: { currentProvider: "Spectrum" }, rejectedProviders: ["AT&T"] }) });
  assert.doesNotMatch(result.message, /strongest remaining option is AT&T/i);
  assert.match(result.message, /removed AT&T/i);
  assert.equal(result.decision.action, "recalculate_recommendation");
});

test("does not recommend the customer's current provider", () => {
  const result = orchestrateEnterpriseResponse({ message: "show alternatives", providers, routerResult: router({ facts: { currentProvider: "Spectrum" } }) });
  assert.equal(result.rankedProviders.some((item) => item.name === "Spectrum"), false);
});
