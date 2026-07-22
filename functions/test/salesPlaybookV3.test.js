import test from "node:test";
import assert from "node:assert/strict";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";
import { extractFactsFromMessage } from "../services/toolRouter/customerMemoryService.js";

const providers = [
  { provider_name: "EarthLink", technology_code_type: "Fiber" },
  { provider_name: "Spectrum", technology_code_type: "Cable" },
  { provider_name: "Frontier", technology_code_type: "Fiber" },
  { provider_name: "AT&T", technology_code_type: "Fiber" },
];

const discovered = {
  facts: {
    currentProvider: "AT&T", customerName: "Phyllis Rogers", preferredName: "Phyllis",
    monthlyBill: 115, usageImpact: "work from home and streaming", decisionPriority: "price",
    buyingTimeline: "as soon as possible", switchIntent: "as soon as possible",
  },
  preferences: ["price"], painPoints: ["price"], householdNeeds: ["workFromHome", "streaming"], rejectedProviders: [],
};

test("phase 1 completes discovery before presenting providers", () => {
  const incomplete = structuredClone(discovered);
  delete incomplete.facts.buyingTimeline;
  delete incomplete.facts.switchIntent;
  const result = orchestrateSalesResponse({ message: "lower price matters", memory: incomplete, providers });
  assert.equal(result.nextAction, "ask_switch_intent");
  assert.doesNotMatch(result.message, /email|phone/i);
});

test("phase 2 presents three options and excludes the current provider", () => {
  const result = orchestrateSalesResponse({ message: "as soon as possible", memory: { ...discovered, lastNextAction: "ask_switch_intent" }, providers });
  assert.equal(result.nextAction, "present_options");
  assert.match(result.message, /EarthLink|Spectrum|Frontier/);
  assert.doesNotMatch(result.message, /\d\. AT&T/);
});

test("phase 3 starts contact capture only after an option is selected", () => {
  const result = orchestrateSalesResponse({ message: "Spectrum", memory: { ...discovered, lastNextAction: "present_options" }, providers });
  assert.equal(result.nextAction, "ask_email");
  assert.match(result.message, /call you as soon as possible/i);
});

test("phase 3 captures ASAP call time and explicit permission", () => {
  const time = extractFactsFromMessage("as soon as possible", { facts: {}, lastNextAction: "ask_best_contact_time", recentTurns: [] });
  assert.equal(time.facts.bestContactTime, "as soon as possible");
  const permission = extractFactsFromMessage("yes please call me", { facts: {}, lastNextAction: "ask_followup_permission", recentTurns: [] });
  assert.equal(permission.facts.followUpPermission, true);
});

test("phase 4 closes with a sales summary and immediate call expectation", () => {
  const memory = {
    ...discovered,
    lastNextAction: "ask_followup_permission",
    selectedProvider: { name: "Spectrum" },
    facts: { ...discovered.facts, email: "phyllis@example.com", phone: "770-954-0280", contactPreference: "any", bestContactTime: "as soon as possible", followUpPermission: true },
  };
  const result = orchestrateSalesResponse({ message: "yes please call me", memory, providers });
  assert.equal(result.stage, "ORDER_READY");
  assert.equal(result.nextAction, "close_conversation");
  assert.match(result.message, /current provider as AT&T/i);
  assert.match(result.message, /call you as soon as possible/i);
});
