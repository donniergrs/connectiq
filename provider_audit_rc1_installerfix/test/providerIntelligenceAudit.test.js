import test from "node:test";
import assert from "node:assert/strict";
import {
  auditLookupPayload,
  buildVerifiedRecommendation,
  normalizeProviderList,
  runProviderDiagnostic,
} from "../src/services/provider-intelligence/index.js";

test("normalizes FCC provider fields into the unified provider model", () => {
  const [provider] = normalizeProviderList([{ provider_id: "42", brand_name: "Example Fiber", technology_code_type: "Fiber to the Premises", maxdown: "1000", maxup: "1000" }], "fcc");
  assert.equal(provider.displayName, "Example Fiber");
  assert.equal(provider.download, 1000);
  assert.equal(provider.upload, 1000);
  assert.equal(provider.verified, true);
});

test("an empty verified list creates no recommendation or alternative", () => {
  const result = buildVerifiedRecommendation([]);
  assert.equal(result.status, "no_verified_providers");
  assert.equal(result.recommendation, null);
  assert.equal(result.alternative, null);
});

test("unverified and fallback providers cannot become recommendations", () => {
  const result = buildVerifiedRecommendation([{ name: "AT&T Fiber", technology: "Fiber", verified: false }]);
  assert.equal(result.recommendation, null);
});

test("current carrier is excluded from verified provider recommendations", () => {
  const providers = normalizeProviderList([
    { name: "Spectrum", technology: "Cable", maxdown: 1000, maxup: 40 },
    { name: "Example Fiber", technology: "Fiber", maxdown: 1000, maxup: 1000 },
  ], "fcc");
  const result = buildVerifiedRecommendation(providers, { currentCarrier: "Spectrum" });
  assert.equal(result.recommendation.displayName, "Example Fiber");
  assert.equal(result.eligibleProviders.some((provider) => provider.displayName === "Spectrum"), false);
});

test("audit detects static fallback attached to an empty lookup", () => {
  const audit = auditLookupPayload({ source: "fallback", providers: [], fallbackProviders: [{ name: "AT&T" }] });
  assert.equal(audit.hasStaticFallback, true);
  assert.equal(audit.emptyVerifiedResult, true);
  assert.ok(audit.warnings.length >= 2);
});

test("diagnostic trace preserves zero-provider truth without a fallback recommendation", async () => {
  const report = await runProviderDiagnostic({
    address: "1 Test St",
    lookup: async () => ({ source: "fcc", providers: [], fallbackProviders: [] }),
  });
  assert.equal(report.audit.providerCount, 0);
  assert.equal(report.recommendation.recommendation, null);
  assert.equal(report.trace.status, "complete");
  assert.ok(report.trace.events.some((event) => event.step === "recommendation_evaluated"));
});

test("diagnostic records lookup failures and still does not invent a carrier", async () => {
  const report = await runProviderDiagnostic({ address: "Bad Address", lookup: async () => { throw new Error("lookup timeout"); } });
  assert.equal(report.trace.status, "failed");
  assert.equal(report.recommendation.recommendation, null);
  assert.match(report.error, /timeout/);
});
