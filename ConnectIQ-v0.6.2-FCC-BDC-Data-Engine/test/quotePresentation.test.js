import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuoteTradeoffs,
  findNextBestProvider,
  quoteMatchLabel,
} from "../src/services/brain/quote/quotePresentation.js";

test("maps quote scores to customer-facing match labels", () => {
  assert.equal(quoteMatchLabel(97), "Excellent match");
  assert.equal(quoteMatchLabel(90), "Strong match");
  assert.equal(quoteMatchLabel(75), "Good match");
  assert.equal(quoteMatchLabel(60), "Best available fit");
});

test("finds the highest-ranked provider that is not the recommendation", () => {
  const providers = [
    { id: "att", displayName: "AT&T Fiber", advisorScore: 96 },
    { id: "spectrum", displayName: "Spectrum", advisorScore: 84 },
  ];
  assert.equal(findNextBestProvider(providers, providers[0]).displayName, "Spectrum");
});

test("builds transparent quote strengths and tradeoffs", () => {
  const result = buildQuoteTradeoffs({
    quote: {
      provider: "AT&T Fiber",
      upload: 1000,
      reasons: ["Supports remote work."],
      pricing: { estimated: true },
      installation: { disclaimer: "Scheduling is confirmed by the provider." },
    },
    recommendation: { displayName: "AT&T Fiber", upload: 1000 },
    nextBest: { displayName: "Spectrum", upload: 35 },
  });
  assert.deepEqual(result.strengths, ["Supports remote work."]);
  assert.ok(result.tradeoffs.some((item) => /estimate/i.test(item)));
  assert.ok(result.tradeoffs.some((item) => /upload capacity/i.test(item)));
});

test("returns a fallback strength when quote reasons are absent", () => {
  const result = buildQuoteTradeoffs({ quote: {}, recommendation: {} });
  assert.equal(result.strengths.length, 1);
  assert.match(result.strengths[0], /household profile/i);
});
