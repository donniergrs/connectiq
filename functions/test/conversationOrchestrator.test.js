import test from "node:test";
import assert from "node:assert/strict";
import { detectTopics, decideNextAction, orchestrateTurn } from "../services/conversationOrchestrator/index.js";
import { clearCustomerMemory } from "../services/toolRouter/customerMemoryService.js";
import { routeConversationTurn } from "../services/toolRouter/routerService.js";

test("detects multiple topics in one customer message", () => {
  const topics = detectTopics("Spectrum keeps going out, do you have mobile, and I need installation before Friday?");
  assert.ok(topics.includes("reliability"));
  assert.ok(topics.includes("mobile"));
  assert.ok(topics.includes("installation"));
});

test("decision engine does not repeat resolved questions", () => {
  const result = decideNextAction({ memory: { facts: { currentProvider: "AT&T", monthlyBill: 115 }, painPoints: ["price"] }, providers: [{ name: "Lumos" }] });
  assert.equal(result.action, "PRESENT_RECOMMENDATION");
});

test("orchestrator creates independent threads", () => {
  const result = orchestrateTurn({ message: "I need a cheaper plan and want to know about installation", memory: { facts: {} } });
  assert.ok(result.threads.some((item) => item.topic === "pricing"));
  assert.ok(result.threads.some((item) => item.topic === "installation"));
});

test("full router advances after provider, bill, and priority", async () => {
  clearCustomerMemory();
  const sessionId = "rc1-flow";
  await routeConversationTurn({ sessionId, message: "AT&T" });
  await routeConversationTurn({ sessionId, message: "115 a month" });
  const result = await routeConversationTurn({ sessionId, message: "price", context: { providers: [{ name: "Lumos", maxdown: 1000 }] } });
  assert.equal(result.orchestration.decision.action, "PRESENT_RECOMMENDATION");
  assert.ok(result.memory.threads.length > 0);
  assert.ok(result.memory.journal.length >= 3);
});

test("human handoff overrides discovery", () => {
  const result = orchestrateTurn({ message: "I want to speak to a human", memory: { facts: {} } });
  assert.equal(result.decision.action, "HUMAN_HANDOFF");
});
