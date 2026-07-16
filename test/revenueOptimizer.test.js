import test from "node:test";
import assert from "node:assert/strict";
import { rankProviderOptions, scoreProvider } from "../src/services/brain/revenueOptimizer.js";

test("recommendation uses 60 percent revenue and 40 percent customer value", () => {
  const scored = scoreProvider({ name: "FiberCo", technology: "Fiber", confidence: 90 }, {}, { commission: 200, spiff: 100, monthlyRecurring: 10 });
  assert.equal(scored.weights.revenue, 0.6);
  assert.equal(scored.weights.customer, 0.4);
  assert.ok(scored.revenueScore > 50);
});

test("higher revenue can rank first when customer fit remains viable", () => {
  const ranked = rankProviderOptions([
    { name: "A", technology: "Fiber", confidence: 90 },
    { name: "B", technology: "Cable", confidence: 85 },
  ], {}, { A: { commission: 50 }, B: { commission: 400, spiff: 100 } });
  assert.equal(ranked[0].name, "B");
});
