import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesPlan, buildConversationSummary } from "../src/services/salesBrain/salesBrain.js";

test("sales brain starts with an introduction for a new lead", () => {
  const plan = buildSalesPlan({ name: "Jane Doe", phone: "5551112222" });
  assert.equal(plan.stage, "introduction");
  assert.match(plan.opening, /Jane/);
  assert.equal(plan.nextQuestion, "Is now a good time for a quick conversation?");
});

test("sales brain advances to recommendation when a provider exists", () => {
  const plan = buildSalesPlan({ currentProvider: "Spectrum", primaryPainPoint: "Frequent outages", buyingTimeline: "This week", questionnaireCompleted: true, recommendedProvider: "AT&T Fiber" });
  assert.equal(plan.stage, "recommendation");
  assert.equal(plan.priority, "High");
  assert.match(plan.recommendationExplanation, /steadier connection/i);
});

test("summary is concise and contains the next action", () => {
  const summary = buildConversationSummary({ lead: { currentProvider: "Spectrum", primaryPainPoint: "High bill" }, disposition: "Callback Requested" });
  assert.match(summary, /Spectrum/);
  assert.match(summary, /Callback Requested/);
  assert.match(summary, /Next action/);
});
