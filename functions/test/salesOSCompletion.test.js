import test from "node:test";
import assert from "node:assert/strict";
import { detectComparisonIntent, orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [
  { provider_name: "AT&T", technology_code_type: "Fiber", monthlyPrice: 65, maxdown: 1000 },
  { provider_name: "Xfinity", technology_code_type: "Cable", monthlyPrice: 55, maxdown: 1200 },
  { provider_name: "T-Mobile", technology_code_type: "Fixed Wireless", monthlyPrice: 50, maxdown: 300 },
  { provider_name: "Spectrum", technology_code_type: "Cable", monthlyPrice: 80, maxdown: 1000 },
];

const completeMemory = {
  facts: {
    currentProvider: "Spectrum", customerName: "Lochlin", preferredName: "Lochlin",
    monthlyBill: 85, decisionPriority: "reliability", switchIntent: "immediately",
  },
  preferences: ["reliability"], householdNeeds: ["gaming", "streaming"], painPoints: ["reliability"],
  rejectedProviders: [], lastNextAction: "present_options",
};

test("pricing is detected as comparison intent", () => {
  assert.equal(detectComparisonIntent("pricing"), "price");
  assert.equal(detectComparisonIntent("show me the cheapest"), "cheapest");
});

test("pricing after options does not select AT&T", () => {
  const result = orchestrateSalesResponse({ message: "pricing", memory: completeMemory, providers });
  assert.equal(result.stage, "COMPARISON");
  assert.equal(result.nextAction, "ask_comparison_interest");
  assert.equal(result.selectedProviderName, null);
  assert.match(result.message, /compare the top options by pricing/i);
  assert.doesNotMatch(result.message, /focus first on AT&T/i);
});

test("explicit provider selection still selects provider", () => {
  const result = orchestrateSalesResponse({ message: "Xfinity", memory: completeMemory, providers });
  assert.equal(result.stage, "CLOSING");
  assert.equal(result.selectedProviderName, "Xfinity");
  assert.equal(result.nextAction, "ask_email");
});

test("accepting comparison advances to contact capture without forced provider", () => {
  const memory = { ...completeMemory, facts: { ...completeMemory.facts, comparisonIntent: "price" }, lastNextAction: "ask_comparison_interest" };
  const result = orchestrateSalesResponse({ message: "yes", memory, providers });
  assert.equal(result.stage, "CLOSING");
  assert.equal(result.nextAction, "ask_email");
  assert.equal(result.selectedProviderName, null);
});

test("current provider stays excluded", () => {
  const result = orchestrateSalesResponse({ message: "pricing", memory: completeMemory, providers });
  assert.ok(!result.comparisonProviders.includes("Spectrum"));
});
