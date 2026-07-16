import test from "node:test";
import assert from "node:assert/strict";
import { rankProviders, scoreProvider } from "../src/services/brain/recommendationEngine.js";
import { recommendationConfidence } from "../src/services/brain/explainability.js";

const fiber = {
  displayName: "Fiber Co",
  technology: "Fiber to the Premises",
  download: 1000,
  upload: 1000,
  lowLatency: true,
  monthlyPrice: 85,
};

const cable = {
  displayName: "Cable Co",
  technology: "Cable",
  download: 1000,
  upload: 35,
  lowLatency: true,
  monthlyPrice: 75,
};

const fixedWireless = {
  displayName: "Wireless Co",
  technology: "Licensed Fixed Wireless",
  download: 300,
  upload: 20,
  monthlyPrice: 60,
};

test("remote-work and reliability needs rank fiber first", () => {
  const ranked = rankProviders([cable, fixedWireless, fiber], {
    people: 4,
    devices: 20,
    workFromHome: true,
    streaming: true,
    reliability: true,
    priority: "reliability",
    budget: 100,
  });

  assert.equal(ranked[0].displayName, "Fiber Co");
  assert.ok(ranked[0].advisorScore > ranked[1].advisorScore);
  assert.ok(ranked[0].recommendationReasons.some((reason) => reason.includes("upload")));
});

test("all scoring categories total 100 possible points", () => {
  const score = scoreProvider(fiber, {
    people: 2,
    devices: 8,
    workFromHome: true,
    streaming: true,
    gaming: true,
    creator: true,
    priority: "reliability",
    budget: 100,
  });

  assert.equal(score.total, 100);
  assert.equal(score.reliability, 25);
  assert.equal(score.priorityFit, 15);
});

test("price priority rewards an option within budget", () => {
  const ranked = rankProviders([
    { ...fiber, monthlyPrice: 140 },
    { ...cable, monthlyPrice: 65 },
  ], {
    people: 2,
    devices: 6,
    priority: "price",
    budget: 70,
  });

  assert.equal(ranked[0].displayName, "Cable Co");
});

test("confidence is bounded and rises with a clear lead", () => {
  const confidence = recommendationConfidence([
    { ...fiber, advisorScore: 95 },
    { ...cable, advisorScore: 80 },
    { ...fixedWireless, advisorScore: 70 },
  ]);

  assert.ok(confidence >= 90);
  assert.ok(confidence <= 98);
});
