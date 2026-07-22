import test from "node:test";
import assert from "node:assert/strict";
import { clearCustomerMemory, hydrateCustomerMemory, learnFromMessage, getCustomerMemory } from "../services/toolRouter/customerMemoryService.js";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [
  { provider_name: "EarthLink", technology_code_type: "Fiber" },
  { provider_name: "Spectrum", technology_code_type: "Cable" },
];

test("answers why-provider question and still asks the next discovery question", () => {
  const memory = {
    facts: { currentProvider: "AT&T", customerName: "Donnie", preferredName: "Donnie" },
    preferences: ["reliability"],
    painPoints: ["reliability"],
    householdNeeds: [],
    rejectedProviders: [],
  };
  const decision = orchestrateSalesResponse({ message: "why earthlink", memory, providers });
  assert.equal(decision.stage, "DISCOVERY");
  assert.equal(decision.nextAction, "ask_issue_type");
  assert.match(decision.message, /EarthLink is currently leading/i);
  assert.match(decision.message, /entire connection|Wi-Fi drops/i);
});

test("captures '115 dollars a month' after monthly bill question and does not ask it again", () => {
  clearCustomerMemory();
  const sessionId = "bill-loop-recovery";
  hydrateCustomerMemory(sessionId, {
    facts: {
      currentProvider: "AT&T",
      customerName: "Donnie",
      preferredName: "Donnie",
      issueType: "connection_outage",
      problemDescription: "whole internet goes out",
      issueFrequency: "weekly",
    },
    preferences: ["reliability"],
    painPoints: ["reliability"],
    lastNextAction: "ask_monthly_bill",
  });
  learnFromMessage(sessionId, "115 dollars a month");
  const memory = getCustomerMemory(sessionId);
  assert.equal(memory.facts.monthlyBill, 115);
  const decision = orchestrateSalesResponse({ message: "115 dollars a month", memory, providers });
  assert.notEqual(decision.nextAction, "ask_monthly_bill");
  assert.equal(decision.nextAction, "ask_customer_impact");
});
