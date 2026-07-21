import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerProfile, evaluateRecommendations } from "../services/recommendationIntelligence/index.js";

test("AI-007 extracts profile from natural language", () => {
  const profile = buildCustomerProfile({ conversation: [{ role: "customer", text: "I have Spectrum and pay $115. I work from home and want a lower bill because Wi-Fi drops." }] });
  assert.equal(profile.currentProvider, "Spectrum");
  assert.equal(profile.monthlyBill, 115);
  assert.equal(profile.workFromHome, true);
  assert.ok(profile.painPoints.includes("High monthly bill"));
});

test("AI-007 excludes current and rejected providers", () => {
  const result = evaluateRecommendations({
    providers: [
      { name: "Spectrum", technology: "Cable", maxdown: 1000, maxup: 35, economics: { oneTimeCommission: 400 } },
      { name: "AT&T Fiber", technology: "Fiber", maxdown: 1000, maxup: 1000, lowLatency: true, economics: { oneTimeCommission: 300 } },
    ],
    customerProfile: { currentProvider: "Spectrum", workFromHome: true, reliabilityPriority: "High", painPoints: ["Reliability problems"] },
  });
  assert.equal(result.recommendation.providerName, "AT&T Fiber");
  assert.equal(result.rankedProviders.find((x) => x.provider.name === "Spectrum").eligible, false);
  assert.ok(result.recommendation.confidence > 0);
  assert.ok(result.recommendation.reasons.length > 0);
});
