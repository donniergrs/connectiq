import test from "node:test";
import assert from "node:assert/strict";
import { rankProviders, orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";
import { extractFactsFromMessage } from "../services/toolRouter/customerMemoryService.js";

const providers = [
  { brand_name: "AT&T Fiber", technology_code_type: "Fiber", startingPrice: 55 },
  { brand_name: "Frontier Fiber", technology_code_type: "Fiber", startingPrice: 50 },
  { brand_name: "EarthLink Fiber", technology_code_type: "Fiber", startingPrice: 60 },
  { brand_name: "Xfinity", technology_code_type: "Cable", startingPrice: 45 },
];

function baseMemory(overrides = {}) {
  return {
    facts: {
      currentProvider: "AT&T",
      monthlyBill: 110,
      customerName: "Donnie",
      preferredName: "Donnie",
      decisionPriority: "balance",
      decisionPriorities: ["price", "reliability", "speed"],
      switchIntent: "immediately",
      buyingTimeline: "immediately",
      ...overrides.facts,
    },
    preferences: ["price"],
    painPoints: ["price"],
    householdNeeds: overrides.householdNeeds ?? ["workFromHome", "streaming"],
    rejectedProviders: overrides.rejectedProviders ?? [],
    lastNextAction: overrides.lastNextAction,
  };
}

test("current provider family excludes branded variants", () => {
  const ranked = rankProviders(providers, baseMemory());
  assert.equal(ranked.some((item) => item.name === "AT&T Fiber"), false);
  assert.deepEqual(ranked.slice(0, 2).map((item) => item.name), ["Frontier Fiber", "EarthLink Fiber"]);
});

test("all three preserves price reliability and speed", () => {
  const patch = extractFactsFromMessage("all three", { facts: {}, lastNextAction: "ask_decision_priority", recentTurns: [] });
  assert.equal(patch.facts.decisionPriority, "balance");
  assert.deepEqual(patch.facts.decisionPriorities, ["price", "reliability", "speed"]);
});

test("price concern receives consultant acknowledgement", () => {
  const memory = baseMemory({ facts: { customerName: undefined, preferredName: undefined, decisionPriority: undefined, decisionPriorities: undefined, switchIntent: undefined, buyingTimeline: undefined }, householdNeeds: [] });
  const result = orchestrateSalesResponse({ message: "I have AT&T and pay 110 and want cheaper", memory, providers });
  assert.equal(result.nextAction, "ask_name");
  assert.match(result.message, /paying about \$110 a month with AT&T/i);
  assert.match(result.message, /lower that bill/i);
});

test("pricing compares and does not select a provider", () => {
  const memory = baseMemory({ lastNextAction: "present_options" });
  const result = orchestrateSalesResponse({ message: "compare pricing", memory, providers });
  assert.equal(result.stage, "COMPARISON");
  assert.equal(result.selectedProviderName, null);
  assert.match(result.message, /compare the strongest alternatives by pricing/i);
  assert.doesNotMatch(result.message, /AT&T Fiber/);
});

test("lead summary is sales ready and callback oriented", () => {
  const memory = baseMemory({ facts: { email: "d@example.com", phone: "864-555-1212", contactPreference: "text_email", bestContactTime: "afternoon", followUpPermission: true, comparisonIntent: "price" }, lastNextAction: "ask_best_contact_time" });
  const result = orchestrateSalesResponse({ message: "afternoon", memory, providers });
  assert.match(result.leadSummary, /currently has AT&T and pays approximately \$110 per month/i);
  assert.match(result.leadSummary, /price, reliability, and speed/i);
  assert.match(result.leadSummary, /Preferred callback timing is afternoon/i);
});
