import test from "node:test";
import assert from "node:assert/strict";
import { planAgentTurn } from "../services/agentRuntime/planner.js";
import { composeFallback } from "../services/agentRuntime/fallbackComposer.js";
import { buildAgentContext } from "../services/agentRuntime/contextBuilder.js";

test("planner answers reliability rather than repeating a recommendation", () => {
  const plan = planAgentTurn({ message: "How reliable is AT&T?", memory: {}, providers: [] });
  assert.equal(plan.action, "answer_reliability");
});

test("planner treats provider rejection as reranking", () => {
  const plan = planAgentTurn({ message: "I don't want AT&T", memory: {}, providers: [] });
  assert.equal(plan.action, "reject_and_rerank");
});

test("context includes recent conversation and customer facts", () => {
  const context = buildAgentContext({
    message: "How much is Frontier?",
    memory: { facts: { currentProvider: "Spectrum", monthlyBill: 115 }, recentTurns: [{ role: "customer", message: "hello" }] },
    providers: [{ displayName: "Frontier", technology: "Fiber" }],
    intent: { primary: "pricing" },
    plan: { action: "answer_pricing" },
  });
  assert.equal(context.customer.facts.monthlyBill, 115);
  assert.equal(context.recentConversation.length, 1);
  assert.equal(context.availableProviders[0].name, "Frontier");
});

test("fallback directly answers reliability question", () => {
  const message = composeFallback({
    message: "How reliable is AT&T?",
    memory: { facts: { currentProvider: "Spectrum" } },
    providers: [{ displayName: "AT&T", technology: "Fiber" }],
    plan: { action: "answer_reliability" },
  });
  assert.match(message, /uptime statistics|reliability/i);
  assert.doesNotMatch(message, /leading option because/i);
});

test("fallback remembers learned facts instead of generic insufficient information", () => {
  const message = composeFallback({
    message: "I work from home and want to lower my bill",
    memory: { facts: { currentProvider: "Spectrum", monthlyBill: 115 }, householdNeeds: ["workFromHome"] },
    providers: [{ displayName: "Frontier", technology: "Fiber" }],
    plan: { action: "continue_consultative_conversation" },
  });
  assert.match(message, /Spectrum/);
  assert.match(message, /\$115/);
  assert.match(message, /work from home/i);
});
