import test from "node:test";
import assert from "node:assert/strict";
import { universityHealth, findProvider, retrieveKnowledge, answerFromUniversity, validateKnowledgeRecord } from "../services/university/index.js";
import { orchestrateEnterpriseResponse } from "../services/enterprise/orchestrator.js";

test("University reports seeded provider and article inventory", () => {
  const health = universityHealth();
  assert.equal(health.ok, true);
  assert.ok(health.providers >= 10);
  assert.ok(health.articles >= 8);
});

test("provider lookup resolves natural provider names", () => {
  assert.equal(findProvider("How is AT&T Fiber service?")?.id, "att-fiber");
  assert.equal(findProvider("Spectrum")?.services.includes("mobile"), true);
});

test("retrieval returns provider and topical knowledge", () => {
  const result = retrieveKnowledge({ message: "Is Frontier reliable for remote work?" });
  assert.equal(result.provider?.id, "frontier-fiber");
  assert.ok(result.articles.some((item) => item.id === "remote-work"));
});

test("service-quality answers avoid unsupported reliability claims", () => {
  const result = answerFromUniversity({ message: "How is their service?", providerName: "Frontier Fiber" });
  assert.equal(result.intent, "service_quality");
  assert.match(result.answer, /would not claim local reliability/i);
  assert.match(result.answer, /Frontier Fiber/);
});

test("pricing answers never invent an exact price", () => {
  const result = answerFromUniversity({ message: "How much is it?", providerName: "AT&T Fiber" });
  assert.equal(result.intent, "pricing");
  assert.match(result.answer, /do not have a verified address-specific price/i);
});

test("mobile answers distinguish known portfolio from address eligibility", () => {
  const result = answerFromUniversity({ message: "Do they offer mobile?", providerName: "Spectrum" });
  assert.equal(result.intent, "mobile");
  assert.match(result.answer, /offers mobile service/i);
  assert.match(result.answer, /verified/i);
});

test("enterprise orchestration replaces mechanical discovery output", () => {
  const result = orchestrateEnterpriseResponse({
    message: "How is their service?",
    selectedProvider: "Frontier Fiber",
    routerResult: { response: { message: "Core discovery information is available. Lead qualification score: 75." }, memory: { facts: {} } },
  });
  assert.equal(result.intent, "service_quality");
  assert.doesNotMatch(result.message, /lead qualification score/i);
  assert.ok(result.citations.length >= 1);
});

test("knowledge schema validates required fields", () => {
  assert.equal(validateKnowledgeRecord({ id: "x", type: "sales", title: "X", tags: [], content: {} }).valid, true);
  assert.equal(validateKnowledgeRecord({}).valid, false);
});
