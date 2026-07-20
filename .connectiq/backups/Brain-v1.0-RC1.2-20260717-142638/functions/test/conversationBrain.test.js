import test from "node:test";
import assert from "node:assert/strict";
import { clearCustomerMemory, learnFromMessage, getCustomerMemory } from "../services/toolRouter/customerMemoryService.js";
import { analyzeIntent } from "../services/toolRouter/intentAnalyzer.js";
import { orchestrateTurn } from "../services/conversationBrain/orchestrator.js";
import { decideNextBestAction } from "../services/conversationBrain/decisionEngine.js";
import { buildAdvisorResponse } from "../services/aiAdvisor/responseBuilder.js";

function turn(sessionId, message, providers = []) {
  const learned = learnFromMessage(sessionId, message);
  const memory = getCustomerMemory(sessionId);
  const intent = analyzeIntent(message, { memory });
  return { learned, memory, intent, orchestration: orchestrateTurn({ sessionId, message, learned, memory, intent, providers }) };
}

test.beforeEach(() => clearCustomerMemory());

test("extracts provider, bill, priority, and need from one message", () => {
  const learned = learnFromMessage("s1", "I have AT&T, pay $115 a month, work from home, and price matters most.");
  assert.equal(learned.facts.currentProvider, "AT&T");
  assert.equal(learned.facts.monthlyBill, 115);
  assert.ok(learned.householdNeeds.includes("workFromHome"));
  assert.ok(learned.preferences.includes("price"));
});

test("understands a provider-only answer", () => {
  assert.equal(learnFromMessage("s2", "Spectrum").facts.currentProvider, "Spectrum");
});

test("understands a natural monthly bill answer", () => {
  assert.equal(learnFromMessage("s3", "115 a month").facts.monthlyBill, 115);
});

test("understands a short priority reply", () => {
  assert.ok(learnFromMessage("s4", "price").preferences.includes("price"));
});

test("detects multiple conversation threads", () => {
  const result = turn("s5", "Spectrum keeps going out. Do you offer installation this Friday? I need a person.");
  const topics = result.orchestration.threads.map(t => t.topic);
  assert.ok(topics.includes("reliability"));
  assert.ok(topics.includes("installation"));
  assert.ok(topics.includes("human_handoff"));
});

test("human handoff receives highest priority", () => {
  const result = turn("s6", "I want a human agent to call me about price.");
  assert.equal(result.orchestration.nextBestAction.action, "human_handoff");
});

test("order intent advances to order preparation", () => {
  const result = turn("s7", "Sign me up today.");
  assert.equal(result.orchestration.nextBestAction.action, "prepare_order");
});

test("asks provider first when provider is unknown", () => {
  const decision = decideNextBestAction({ memory: { facts: {}, preferences: [], painPoints: [], householdNeeds: [] }, intent: { primary: "discovery" } });
  assert.equal(decision.action, "ask_current_provider");
});

test("asks monthly bill after provider is known", () => {
  const decision = decideNextBestAction({ memory: { facts: { currentProvider: "AT&T" }, preferences: [], painPoints: [], householdNeeds: [] }, intent: { primary: "discovery" } });
  assert.equal(decision.action, "ask_monthly_bill");
});

test("does not repeat priority after price has been learned", () => {
  const decision = decideNextBestAction({ memory: { facts: { currentProvider: "AT&T", monthlyBill: 115 }, preferences: ["price"], painPoints: ["price"], householdNeeds: [] }, intent: { primary: "discovery" }, providers: [] });
  assert.notEqual(decision.action, "ask_priority");
});

test("asks for address when discovery is sufficient", () => {
  const decision = decideNextBestAction({ memory: { facts: { currentProvider: "AT&T", monthlyBill: 115 }, preferences: ["price"], painPoints: [], householdNeeds: [] }, intent: { primary: "discovery" }, providers: [] });
  assert.equal(decision.action, "ask_address");
});

test("presents recommendation when providers exist", () => {
  const decision = decideNextBestAction({ memory: { facts: { currentProvider: "AT&T", monthlyBill: 115, serviceAddress: "1 Main St" }, preferences: ["price"], painPoints: [], householdNeeds: [] }, intent: { primary: "recommendation" }, providers: [{ name: "Lumos" }] });
  assert.equal(decision.action, "present_recommendation");
});

test("journal records understanding and decision", () => {
  const result = turn("s8", "I have Spectrum and pay 95 a month.");
  assert.equal(result.orchestration.journal.length, 2);
  assert.equal(result.orchestration.journal[0].type, "customer_message_understood");
});

test("advisor response follows next-best action", () => {
  const response = buildAdvisorResponse({ routerResult: { memory: { facts: { currentProvider: "AT&T" } }, orchestration: { nextBestAction: { action: "ask_monthly_bill" } } } });
  assert.match(response.message, /how much do you pay/i);
});

test("recommendation response explains the fit", () => {
  const response = buildAdvisorResponse({ routerResult: { memory: { facts: {}, painPoints: ["reliability"], householdNeeds: ["workFromHome"], preferences: [] }, orchestration: { nextBestAction: { action: "present_recommendation" } } }, providers: [{ name: "Lumos Fiber" }] });
  assert.match(response.message, /Lumos Fiber/);
  assert.match(response.message, /because/i);
});
