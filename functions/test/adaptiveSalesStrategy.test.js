import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAdaptiveSalesStrategy } from "../services/salesCloser/adaptiveSalesStrategy.js";
import { composeSalesCloserFallback } from "../services/salesCloser/fallbackCloser.js";
import { buildSalesCloserContext } from "../services/salesCloser/contextBuilder.js";

test("classifies a price-sensitive customer and adapts toward savings", () => {
  const result = evaluateAdaptiveSalesStrategy({
    message: "My bill is too expensive and I need something cheaper",
    memory: { facts: { customerName: "Donnie", monthlyBill: 145 }, painPoints: ["price"], preferences: ["price"] },
  });
  assert.equal(result.persona, "budget_conscious");
  assert.equal(result.primaryMotivation, "savings");
  assert.match(result.emphasis, /savings|monthly/i);
});

test("classifies work-from-home reliability needs correctly", () => {
  const result = evaluateAdaptiveSalesStrategy({
    message: "I work from home and cannot keep having outages",
    memory: { facts: { customerName: "Donnie" }, householdNeeds: ["workFromHome"], painPoints: ["reliability"] },
  });
  assert.equal(result.persona, "frustrated_switcher");
  assert.equal(result.primaryMotivation, "reliability");
  assert.equal(result.emotion, "frustrated");
});

test("keeps a just-looking customer in a low-pressure flow", () => {
  const strategy = evaluateAdaptiveSalesStrategy({
    message: "I'm just looking and comparing options",
    memory: { facts: { customerName: "Donnie" } },
  });
  assert.equal(strategy.persona, "skeptical_shopper");
  assert.equal(strategy.readiness, "early_research");
  assert.ok(strategy.avoid.includes("premature contact request"));
});

test("recognizes purchase language and stops unnecessary discovery", () => {
  const result = evaluateAdaptiveSalesStrategy({
    message: "Let's do it, I am ready to switch",
    memory: { facts: { customerName: "Donnie", currentProvider: "Spectrum" } },
    quote: { provider: "Lumos" },
  });
  assert.equal(result.persona, "ready_buyer");
  assert.equal(result.readiness, "ready_to_close");
  assert.ok(result.avoid.includes("unnecessary discovery"));
});

test("sales closer context exposes the adaptive strategy to the model", () => {
  const context = buildSalesCloserContext({
    message: "I game every night and need lower latency",
    memory: { facts: { customerName: "Donnie" }, householdNeeds: ["gaming"], preferences: ["speed"] },
    providers: [{ name: "Lumos", technology: "Fiber" }],
  });
  assert.equal(context.adaptiveStrategy.persona, "performance_enthusiast");
  assert.equal(context.adaptiveStrategy.primaryMotivation, "performance");
});

test("fallback responds without pressure when the customer is only shopping", () => {
  const adaptiveStrategy = evaluateAdaptiveSalesStrategy({ message: "I'm just looking", memory: { facts: { customerName: "Donnie" } } });
  const response = composeSalesCloserFallback({
    message: "I'm just looking",
    memory: { facts: { customerName: "Donnie", preferredName: "Donnie" } },
    providers: [{ name: "Lumos" }],
    adaptiveStrategy,
  });
  assert.match(response, /low-pressure|compare/i);
  assert.doesNotMatch(response, /email address|phone number/i);
});
