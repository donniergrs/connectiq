import test from "node:test";
import assert from "node:assert/strict";
import { extractFactsFromMessage, updateCustomerMemory, clearCustomerMemory } from "../services/toolRouter/customerMemoryService.js";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

test("captures a customer name embedded in a natural sentence", () => {
  const result = extractFactsFromMessage("This is Donnie. im looking for faster and more reliable", { facts: {}, decisions: [] });
  assert.equal(result.facts.customerName, "Donnie");
  assert.equal(result.facts.preferredName, "Donnie");
});

test("accepts any contact method after contact preference question", () => {
  const result = extractFactsFromMessage("anyone of those will work", {
    facts: { customerName: "Donnie", email: "donniergrs@gmail.com", phone: "678-492-8961" },
    lastNextAction: "ask_contact_preference",
    decisions: [],
  });
  assert.equal(result.facts.contactPreference, "text_email");
});

test("asks for the preferred call time after contact preference is captured", () => {
  const decision = orchestrateSalesResponse({
    message: "anyone of those will work",
    memory: {
      facts: { customerName: "Donnie", currentProvider: "AT&T", monthlyBill: 115, email: "donniergrs@gmail.com", phone: "678-492-8961", contactPreference: "any" },
      preferences: ["speed", "reliability"],
      painPoints: ["reliability"],
      householdNeeds: [],
      lastNextAction: "ask_contact_preference",
    },
    providers: [{ displayName: "Frontier", technology: "Fiber" }],
  });
  assert.equal(decision.stage, "DISCOVERY");
  assert.equal(decision.nextAction, "ask_customer_impact");
});

test("not at this time completes instead of restarting introduction", () => {
  const decision = orchestrateSalesResponse({
    message: "not at this time",
    memory: {
      facts: { customerName: "Donnie", currentProvider: "AT&T", email: "donniergrs@gmail.com", phone: "678-492-8961", contactPreference: "any" },
      preferences: ["speed", "reliability"],
      painPoints: ["reliability"],
    },
    providers: [{ displayName: "Frontier", technology: "Fiber" }],
  });
  assert.equal(decision.stage, "COMPLETED");
  assert.equal(decision.nextAction, "complete_conversation");
  assert.doesNotMatch(decision.message, /who do i have the pleasure/i);
});
