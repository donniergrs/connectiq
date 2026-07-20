import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSalesIntelligence } from "../services/salesIntelligence/index.js";

test("scores a dissatisfied high-bill work-from-home customer", () => {
  const result = evaluateSalesIntelligence({
    message: "I want to switch and need installation this week",
    memory: {
      facts: { serviceAddress: "123 Main St", currentProvider: "Spectrum", monthlyBill: 115, phone: "864-555-1212" },
      painPoints: ["price", "reliability"],
      householdNeeds: ["workFromHome"],
    },
    quote: { provider: "Lumos" },
  });
  assert.equal(result.leadScore, 100);
  assert.equal(result.buyingIntent, "High");
  assert.equal(result.pipelineStage, "Order Ready");
  assert.equal(result.orderReady, true);
});

test("keeps an early conversation in discovery", () => {
  const result = evaluateSalesIntelligence({
    message: "I have Spectrum",
    memory: { facts: { serviceAddress: "123 Main St", currentProvider: "Spectrum" }, painPoints: [], householdNeeds: [] },
  });
  assert.equal(result.pipelineStage, "Discovery");
  assert.equal(result.orderReady, false);
});
