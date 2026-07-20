import test from "node:test";
import assert from "node:assert/strict";
import { clearCustomerMemory, updateCustomerMemory, getCustomerMemory } from "../services/toolRouter/customerMemoryService.js";
import { processConversationIntelligence } from "../services/conversationIntelligence/engine.js";

const providers = [
  { name: "Spectrum", technology: "Cable" },
  { name: "AT&T", technology: "Fiber" },
  { name: "Frontier", technology: "Fiber" },
  { name: "EarthLink", technology: "Fiber" },
];

test.beforeEach(() => clearCustomerMemory());

function run(sessionId, message) {
  return processConversationIntelligence({ sessionId, message, providers, memory: getCustomerMemory(sessionId) });
}

test("answers pricing for the active recommendation without repeating recommendation copy", () => {
  updateCustomerMemory("p", { facts: { currentProvider: "AT&T", monthlyBill: 115 }, selectedProvider: "Spectrum" });
  const result = run("p", "how much is it");
  assert.equal(result.intent, "pricing");
  assert.match(result.advisor.message, /verified monthly price for Spectrum/i);
});

test("answers mobile as a mobile question", () => {
  updateCustomerMemory("m", { facts: { currentProvider: "AT&T" }, selectedProvider: "Spectrum" });
  const result = run("m", "do you offer mobile service too");
  assert.equal(result.intent, "mobile");
  assert.match(result.advisor.message, /mobile/i);
});

test("provider correction changes current provider and excludes it", () => {
  updateCustomerMemory("c", { facts: { currentProvider: "AT&T" }, selectedProvider: "Spectrum" });
  const result = run("c", "im actually with spectrum now");
  assert.equal(result.memory.facts.currentProvider, "Spectrum");
  assert.equal(result.quote.provider, "AT&T");
});

test("rejected provider is removed from recommendation and quote", () => {
  updateCustomerMemory("r", { facts: { currentProvider: "AT&T" }, selectedProvider: "Spectrum" });
  const result = run("r", "i dont want spectrum");
  assert.ok(result.memory.rejectedProviders.includes("Spectrum"));
  assert.equal(result.quote.provider, "Frontier");
  assert.match(result.advisor.message, /removed Spectrum/i);
});

test("multi-fact message updates customer twin", () => {
  const result = run("f", "we stream netflix constantly, have three kids, i work from home, wifi upstairs is awful, and i dont want to spend over 90");
  assert.equal(result.memory.facts.children, 3);
  assert.equal(result.memory.facts.budget, 90);
  assert.ok(result.memory.householdNeeds.includes("streaming"));
  assert.ok(result.memory.householdNeeds.includes("workFromHome"));
  assert.ok(result.memory.painPoints.includes("wifiCoverage"));
});

test("why question explains the selected provider", () => {
  updateCustomerMemory("w", { facts: { currentProvider: "Spectrum", budget: 90 }, householdNeeds: ["workFromHome"], selectedProvider: "AT&T" });
  const result = run("w", "why is at&t recommended");
  assert.equal(result.intent, "explanation");
  assert.match(result.advisor.message, /AT&T is currently recommended because/i);
});
