import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderList } from "../src/services/provider-intelligence/providerNormalizer.js";
import { buildVerifiedRecommendation } from "../src/services/provider-intelligence/providerRecommendation.js";

test("AI research candidates are never normalized as verified FCC providers", () => {
  const candidates = normalizeProviderList([
    { name: "Possible Fiber Co", technology: "Fiber", confidence: 88, verified: false },
  ], "openai-web-research");
  assert.equal(candidates[0].verified, false);
  assert.equal(buildVerifiedRecommendation(candidates).recommendation, null);
});

test("live FCC provider rows remain recommendation eligible", () => {
  const providers = normalizeProviderList([
    { provider_name: "Verified Fiber", technology_code_type: "Fiber", maxdown: 2000, maxup: 2000 },
  ], "fcc-live");
  const result = buildVerifiedRecommendation(providers);
  assert.equal(providers[0].verified, true);
  assert.equal(result.recommendation.displayName, "Verified Fiber");
});

test("empty verified results stay empty even when an AI candidate exists separately", () => {
  const result = buildVerifiedRecommendation([]);
  const aiCandidates = [{ displayName: "Possible Cable Co", verified: false }];
  assert.equal(result.recommendation, null);
  assert.equal(aiCandidates.length, 1);
});
