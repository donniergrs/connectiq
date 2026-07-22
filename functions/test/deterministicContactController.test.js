import test from "node:test";
import assert from "node:assert/strict";
import { extractFactsFromMessage } from "../services/toolRouter/customerMemoryService.js";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [
  { displayName: "EarthLink", technology: "Fiber" },
  { displayName: "Spectrum", technology: "Cable" },
];

function baseMemory(lastNextAction = "ask_contact_preference") {
  return {
    lastNextAction,
    facts: {
      customerName: "Phyllis Rogers",
      preferredName: "Phyllis",
      currentProvider: "AT&T",
      monthlyBill: 115,
      issueType: "price",
      decisionPriority: "price",
      switchIntent: "as soon as possible",
      email: "phyllis@example.com",
      phone: "864-982-2042",
    },
    painPoints: ["price"],
    preferences: ["price"],
    householdNeeds: ["workFromHome"],
    rejectedProviders: [],
    recentTurns: [{ role: "advisor", message: "A ConnectIQ Internet Advisor will call you as soon as possible. May we also text or email you about your comparison if needed?" }],
  };
}

test("yes completes contact preference and follow-up permission", () => {
  const result = extractFactsFromMessage("yes", baseMemory());
  assert.equal(result.facts.contactPreference, "text_email");
  assert.equal(result.facts.followUpPermission, true);
});

test("both work completes contact preference and follow-up permission", () => {
  const result = extractFactsFromMessage("both work", baseMemory());
  assert.equal(result.facts.contactPreference, "text_email");
  assert.equal(result.facts.followUpPermission, true);
});

test("controller advances to best contact time after preference is captured", () => {
  const memory = baseMemory();
  memory.facts.contactPreference = "text_email";
  memory.facts.followUpPermission = true;
  const response = orchestrateSalesResponse({ message: "both work", memory, providers });
  assert.equal(response.nextAction, "ask_best_contact_time");
  assert.match(response.message, /preferred time|as soon as possible/i);
  assert.doesNotMatch(response.message, /May we also text or email/i);
});

test("phone only is a completed valid preference", () => {
  const result = extractFactsFromMessage("phone only", baseMemory());
  assert.equal(result.facts.contactPreference, "phone");
  assert.equal(result.facts.followUpPermission, true);
});
