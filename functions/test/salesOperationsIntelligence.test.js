import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSalesIntelligence } from "../services/salesIntelligence/index.js";

const memory = {
  facts: {
    serviceAddress: "100 Main St",
    currentProvider: "Spectrum",
    monthlyBill: 125,
    phone: "8645551212",
  },
  painPoints: ["price", "reliability"],
  householdNeeds: ["workFromHome", "gaming"],
};

test("RC3.4 creates an actionable hot order-ready lead", () => {
  const result = evaluateSalesIntelligence({
    message: "Let's do it. How soon can you install? Call me back.",
    memory,
    quote: { provider: "Lumos Fiber" },
  });
  assert.equal(result.pipelineStage, "Order Ready");
  assert.equal(result.priority, "Hot");
  assert.equal(result.buyingIntent, "High");
  assert.equal(result.followUpPlan.required, true);
  assert.equal(result.followUpPlan.contactMethod, "phone");
  assert.ok(result.closeProbability >= 80);
});

test("RC3.4 produces a practical next action for qualified prospects", () => {
  const result = evaluateSalesIntelligence({ message: "My bill is too high", memory, quote: null });
  assert.equal(result.nextBestAction, "present_recommendation");
  assert.equal(result.followUpPlan.required, true);
  assert.equal(result.likelyObjection, "Price and monthly savings");
});
