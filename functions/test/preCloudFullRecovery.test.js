import test from "node:test";
import assert from "node:assert/strict";
import { hydrateCustomerMemory, learnFromMessage, getCustomerMemory } from "../services/toolRouter/customerMemoryService.js";

test("cloud hydration preserves original local customer memory", () => {
  const id = `recovery-${Date.now()}`;
  hydrateCustomerMemory(id, { facts: { currentProvider: "AT&T", monthlyBill: 75 }, painPoints: ["reliability"], householdNeeds: ["workFromHome", "streaming"], rejectedProviders: ["AT&T"] });
  learnFromMessage(id, "I do not want AT&T and the outages affect my work meetings");
  const memory = getCustomerMemory(id);
  assert.equal(memory.facts.currentProvider, "AT&T");
  assert.equal(memory.facts.monthlyBill, 75);
  assert.ok(memory.painPoints.includes("reliability"));
  assert.ok(memory.householdNeeds.includes("workFromHome"));
  assert.ok(memory.rejectedProviders.includes("AT&T"));
});
