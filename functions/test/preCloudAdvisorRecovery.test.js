import test from "node:test";
import assert from "node:assert/strict";
import { clearCustomerMemory, hydrateCustomerMemory, learnFromMessage, getCustomerMemory } from "../services/toolRouter/customerMemoryService.js";

test("cloud hydration preserves the pre-cloud customer profile", () => {
  clearCustomerMemory();
  hydrateCustomerMemory("recovery-1", {
    facts: { currentProvider: "AT&T", monthlyBill: 75 },
    painPoints: ["reliability"],
    householdNeeds: ["workFromHome", "streaming"],
    rejectedProviders: ["AT&T"],
  });
  const memory = getCustomerMemory("recovery-1");
  assert.equal(memory.facts.currentProvider, "AT&T");
  assert.equal(memory.facts.monthlyBill, 75);
  assert.deepEqual(memory.rejectedProviders, ["AT&T"]);
});

test("contact preference remains extractable after cloud recovery", () => {
  clearCustomerMemory();
  hydrateCustomerMemory("recovery-2", { recentTurns: [{ role: "advisor", message: "Would you prefer text, email, or phone?" }] });
  learnFromMessage("recovery-2", "Text");
  assert.equal(getCustomerMemory("recovery-2").facts.contactPreference, "text");
});
