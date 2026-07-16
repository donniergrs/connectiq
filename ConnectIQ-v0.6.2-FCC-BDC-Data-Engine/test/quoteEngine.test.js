import test from "node:test";
import assert from "node:assert/strict";
import { buildQuote, selectRecommendedPlan } from "../src/services/brain/quoteEngine.js";

const fiber = {
  id: "fiber-co",
  displayName: "Fiber Co",
  technology: "Fiber to the Premises",
  download: 5000,
  upload: 5000,
  advisorScore: 96,
};

const cable = {
  id: "cable-co",
  displayName: "Cable Co",
  technology: "Cable",
  download: 1000,
  upload: 35,
  advisorScore: 84,
};

test("selects a right-sized fiber plan for a typical household", () => {
  const plan = selectRecommendedPlan(fiber, {
    people: 2,
    devices: 8,
    streaming: true,
    priority: "reliability",
    budget: 100,
  });

  assert.equal(plan.name, "Fiber 300");
  assert.equal(plan.download, 300);
});

test("speed priority selects the fastest capable planning tier", () => {
  const plan = selectRecommendedPlan(fiber, {
    people: 4,
    devices: 25,
    gaming: true,
    streaming: true,
    priority: "speed",
  });

  assert.equal(plan.name, "Fiber 5 Gig");
});

test("price priority favors a capable plan within budget", () => {
  const plan = selectRecommendedPlan(cable, {
    people: 1,
    devices: 4,
    priority: "price",
    budget: 70,
  });

  assert.ok(plan.estimatedMonthlyPrice <= 70);
  assert.equal(plan.name, "Internet 300");
});

test("builds a normalized versioned quote with transparent estimates", () => {
  const quote = buildQuote({
    recommendation: fiber,
    address: "101 Main St, Greenville, SC",
    needs: { people: 3, devices: 12, workFromHome: true, streaming: true, budget: 100 },
  });

  assert.equal(quote.quoteVersion, "3D-1.0");
  assert.equal(quote.provider, "Fiber Co");
  assert.equal(quote.status, "Estimate");
  assert.equal(quote.pricing.estimated, true);
  assert.match(quote.disclaimer, /Final plan price/i);
  assert.ok(quote.recommendedPlan.name);
  assert.ok(quote.reasons.some((reason) => /video calls|streaming|budget/i.test(reason)));
});

test("uses provider-supplied price when available", () => {
  const quote = buildQuote({
    recommendation: { ...fiber, monthlyPrice: 72.5 },
    address: "101 Main St",
    needs: { people: 2, devices: 5 },
  });

  assert.equal(quote.monthlyPrice, 72.5);
  assert.equal(quote.pricing.source, "provider-data");
});

test("installation guidance avoids guaranteed dates", () => {
  const quote = buildQuote({ recommendation: cable, needs: { people: 2, devices: 6 } });
  assert.match(quote.installation.estimatedWindow, /varies|verification/i);
  assert.match(quote.installation.disclaimer, /confirmed/i);
});
