import test from "node:test";
import assert from "node:assert/strict";
import { composeSalesCloserFallback } from "../services/salesCloser/fallbackCloser.js";
import { buildSalesCloserContext } from "../services/salesCloser/contextBuilder.js";
import { clearCustomerMemory, getCustomerMemory, learnFromMessage, updateCustomerMemory } from "../services/toolRouter/customerMemoryService.js";

test("David introduces himself and asks for the customer's name first", () => {
  const message = composeSalesCloserFallback({
    message: "123 Main Street, Greenville, SC 29601",
    memory: { facts: { serviceAddress: "123 Main Street, Greenville, SC 29601" }, recentTurns: [] },
    providers: [{ name: "Lumos", technology: "Fiber" }],
  });
  assert.match(message, /I'm David/i);
  assert.match(message, /who do i have|who am i speaking/i);
  assert.doesNotMatch(message, /provider are you with|how much/i);
});

test("a short reply after David asks is stored as the customer name", () => {
  clearCustomerMemory();
  updateCustomerMemory("relationship-name", {
    recentTurns: [{ role: "advisor", message: "Hey, I'm David. Who do I have the pleasure of speaking with?" }],
  });
  learnFromMessage("relationship-name", "Donnie");
  const memory = getCustomerMemory("relationship-name");
  assert.equal(memory.facts.customerName, "Donnie");
  assert.equal(memory.facts.preferredName, "Donnie");
});

test("email, phone, contact preference, and best contact time are captured", () => {
  clearCustomerMemory();
  learnFromMessage("relationship-contact", "Send it to donnie@example.com");
  learnFromMessage("relationship-contact", "My number is 864-555-1212");
  learnFromMessage("relationship-contact", "Text me in the afternoon");
  const facts = getCustomerMemory("relationship-contact").facts;
  assert.equal(facts.email, "donnie@example.com");
  assert.equal(facts.phone, "864-555-1212");
  assert.equal(facts.contactPreference, "text");
  assert.equal(facts.bestContactTime, "afternoon");
});

test("relationship context requests email before phone after a quote is available", () => {
  const context = buildSalesCloserContext({
    message: "Let's do it",
    memory: { facts: { customerName: "Donnie", preferredName: "Donnie" }, recentTurns: [] },
    providers: [{ name: "Lumos" }],
    quote: { provider: "Lumos" },
  });
  assert.equal(context.advisorIdentity.name, "David");
  assert.equal(context.relationshipStage, "ASK_EMAIL_FOR_QUOTE");
});

test("fallback requests email, then phone, then contact preference", () => {
  const quote = { provider: "Lumos" };
  const base = { customerName: "Donnie", preferredName: "Donnie" };
  const emailQuestion = composeSalesCloserFallback({ message: "Let's do it", memory: { facts: base }, quote });
  assert.match(emailQuestion, /email address/i);
  const phoneQuestion = composeSalesCloserFallback({ message: "donnie@example.com", memory: { facts: { ...base, email: "donnie@example.com" } }, quote });
  assert.match(phoneQuestion, /phone number/i);
  const preferenceQuestion = composeSalesCloserFallback({ message: "864-555-1212", memory: { facts: { ...base, email: "donnie@example.com", phone: "864-555-1212" } }, quote });
  assert.match(preferenceQuestion, /text, email, or a phone call/i);
});
