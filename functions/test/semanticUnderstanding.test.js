import test from "node:test";
import assert from "node:assert/strict";
import { SemanticUnderstandingEngine } from "../services/semanticUnderstanding/engine.js";
import { SemanticUnderstandingService } from "../services/semanticUnderstanding/service.js";

test("extracts provider, bill, pain points, usage, and intent", () => {
  const engine = new SemanticUnderstandingEngine({ clock: () => "2026-07-17T12:00:00.000Z" });
  const result = engine.analyze({
    text: "I currently have Spectrum and pay $145 a month. It keeps dropping while I work from home and stream 4K. I want something more reliable.",
    customerId: "customer-100",
  });
  assert.equal(result.intent.primary, "IMPROVE_RELIABILITY");
  assert.equal(result.sentiment.label, "negative");
  assert.equal(result.facts.find((f) => f.key === "currentProvider").value, "Spectrum");
  assert.equal(result.facts.find((f) => f.key === "monthlyBill").value, 145);
  assert.equal(result.facts.find((f) => f.key === "workFromHome").value, true);
  assert.equal(result.facts.find((f) => f.key === "outages").value, true);
  assert.equal(result.facts.find((f) => f.key === "primaryPriority").value, "reliability");
});

test("normalizes gigabit speeds to Mbps", () => {
  const engine = new SemanticUnderstandingEngine();
  const result = engine.analyze({ text: "I have 1 gig now but I want 2 gig service." });
  assert.equal(result.facts.find((f) => f.key === "currentSpeedMbps").value, 1000);
  assert.equal(result.facts.find((f) => f.key === "desiredSpeedMbps").value, 2000);
});

test("detects contradictions against the customer twin", () => {
  const engine = new SemanticUnderstandingEngine();
  const twin = { understanding: { currentService: { currentProvider: { value: "Spectrum", confidence: 0.99 } } } };
  const result = engine.analyze({ text: "My provider is AT&T.", twin });
  assert.equal(result.contradictions.length, 1);
  assert.equal(result.contradictions[0].existingValue, "Spectrum");
  assert.equal(result.contradictions[0].newValue, "AT&T");
});

test("selects the address as the highest-value question for provider discovery", () => {
  const engine = new SemanticUnderstandingEngine();
  const result = engine.analyze({ text: "What internet providers are available for me?" });
  assert.equal(result.intent.primary, "FIND_PROVIDER");
  assert.equal(result.nextBestQuestion.id, "address");
});

test("understands written number words for household and remote workers", () => {
  const engine = new SemanticUnderstandingEngine();
  const result = engine.analyze({
    text: "We are a family of five with two people working from home."
  });
  assert.equal(result.facts.find((f) => f.key === "householdSize").value, 5);
  assert.equal(result.facts.find((f) => f.key === "remoteWorkers").value, 2);
});

test("processes natural language and updates the customer digital twin", async () => {
  const service = new SemanticUnderstandingService();
  const result = await service.process({
    customerId: "customer-200",
    sessionId: "session-200",
    channel: "web",
    text: "We are a family of five with two people working from home. I pay $180 to Xfinity and need a cheaper, more reliable option this week.",
  });
  assert.equal(result.twin.understanding.household.householdSize.value, 5);
  assert.equal(result.twin.understanding.household.remoteWorkers.value, 2);
  assert.equal(result.twin.understanding.budget.monthlyBill.value, 180);
  assert.equal(result.twin.understanding.currentService.currentProvider.value, "Xfinity");
  assert.equal(result.twin.understanding.goals.switchTimeline.value, "within_week");
  assert.ok(result.changes.length >= 5);
});

test("does not repeat the monthly bill question after a natural monthly-price answer", async () => {
  const service = new SemanticUnderstandingService();
  const customerId = `cxp001-${Date.now()}`;
  const first = await service.process({ customerId, sessionId: "web-1", text: "I have Spectrum and they suck" });
  assert.equal(first.nextBestQuestion.id, "monthlyBill");
  const second = await service.process({ customerId, sessionId: "web-1", text: "115 a month and I need a cheaper price" });
  assert.notEqual(second.nextBestQuestion.id, "monthlyBill");
  assert.equal(second.twin.understanding.budget.monthlyBill.value, 115);
});
