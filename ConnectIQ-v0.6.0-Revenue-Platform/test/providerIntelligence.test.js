import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderList } from "../src/services/provider-intelligence/providerNormalizer.js";
import { buildVerifiedRecommendation } from "../src/services/provider-intelligence/providerRecommendation.js";

const needs = { priority: "reliability", devices: 6, streaming: true };

test("empty provider results stay empty with no fallback recommendation", () => {
  const result = buildVerifiedRecommendation([], { needs });
  assert.equal(result.status, "no_verified_providers");
  assert.equal(result.recommendation, null);
  assert.deepEqual(result.eligibleProviders, []);
});

test("unverified static providers cannot become recommendations", () => {
  const providers = normalizeProviderList([{ name: "AT&T", technology: "Fiber", download: 5000 }], "fcc-static-database");
  const result = buildVerifiedRecommendation(providers, { needs });
  assert.equal(providers[0].verified, false);
  assert.equal(result.recommendation, null);
});

test("verified providers are normalized and ranked", () => {
  const providers = normalizeProviderList([
    { provider_name: "Cable Co", technology_code_type: "Cable", maxdown: 1000, maxup: 40 },
    { provider_name: "Fiber Co", technology_code_type: "Fiber", maxdown: 2000, maxup: 2000 },
  ], "fcc");
  const result = buildVerifiedRecommendation(providers, { needs });
  assert.equal(result.status, "recommended");
  assert.equal(result.recommendation.displayName, "Fiber Co");
});

test("current carrier is excluded from verified recommendations", () => {
  const providers = normalizeProviderList([
    { name: "Spectrum", technology: "Cable", download: 1000, upload: 40 },
    { name: "Lumos Fiber", technology: "Fiber", download: 2000, upload: 2000 },
  ], "fcc");
  const result = buildVerifiedRecommendation(providers, { currentCarrier: "Spectrum", needs });
  assert.equal(result.recommendation.displayName, "Lumos Fiber");
  assert.equal(result.eligibleProviders.some((item) => item.displayName === "Spectrum"), false);
});
