import test from "node:test";
import assert from "node:assert/strict";
import { clearCustomerMemory, updateCustomerMemory, extractFactsFromMessage } from "../services/toolRouter/customerMemoryService.js";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [{ displayName: "Spectrum", technology: "Cable" }, { displayName: "Frontier", technology: "Fiber" }];

test("asks motivation after learning customer name instead of collecting contact information", () => {
  const decision = orchestrateSalesResponse({ message: "this is Phyllis Rogers", memory: { facts: { currentProvider: "AT&T", customerName: "Phyllis Rogers", preferredName: "Phyllis" }, preferences: [], painPoints: [], householdNeeds: [] }, providers });
  assert.equal(decision.stage, "DISCOVERY");
  assert.equal(decision.nextAction, "ask_primary_motivation");
  assert.doesNotMatch(decision.message, /email|phone/i);
});

test("does not recommend or collect contact data before bill and usage discovery", () => {
  const decision = orchestrateSalesResponse({ message: "I want cheaper service", memory: { facts: { currentProvider: "AT&T", customerName: "Phyllis Rogers", preferredName: "Phyllis" }, preferences: ["price"], painPoints: ["price"], householdNeeds: [] }, providers });
  assert.equal(decision.nextAction, "ask_monthly_bill");
  assert.doesNotMatch(decision.message, /prepare.*quote|email address|phone number/i);
});

test("captures contextual discovery answers using the last next action", () => {
  const issue = extractFactsFromMessage("the whole internet goes out every week", { facts: { currentProvider: "AT&T" }, lastNextAction: "ask_issue_type", recentTurns: [] });
  assert.equal(issue.facts.issueType, "connection_outage");
  const impact = extractFactsFromMessage("I work from home and it interrupts Teams calls", { facts: { currentProvider: "AT&T" }, lastNextAction: "ask_customer_impact", recentTurns: [] });
  assert.match(impact.facts.businessImpact, /work from home/i);
});

test("recommendation request still finishes missing discovery first", () => {
  const decision = orchestrateSalesResponse({ message: "why did you pick Spectrum", memory: { facts: { currentProvider: "AT&T", customerName: "Phyllis", preferredName: "Phyllis" }, preferences: ["price"], painPoints: ["price"], householdNeeds: [] }, providers });
  assert.equal(decision.stage, "DISCOVERY");
  assert.equal(decision.nextAction, "ask_monthly_bill");
  assert.match(decision.message, /need one more detail/i);
});
