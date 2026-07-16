import test from "node:test";
import assert from "node:assert/strict";
import { executeProviderWaterfall } from "../functions/services/providerIntelligenceService.js";

const empty = (source) => async (_address, trace) => {
  trace.push({ source, status: "empty" });
  return { status: "empty", providers: [] };
};

test("OpenAI-only workflow returns provider candidates immediately", async () => {
  const result = await executeProviderWaterfall("1 Main St", {
    ai: async () => ({ status: "suggested", providers: [{ name: "Possible ISP", verified: false }] }),
  });
  assert.equal(result.winner, "openai");
  assert.equal(result.providers[0].verified, false);
  assert.deepEqual(result.sources, { ai: "suggested" });
});

test("OpenAI-only workflow returns none when OpenAI is empty", async () => {
  let otherAdapterCalled = false;
  const result = await executeProviderWaterfall("1 Main St", {
    ai: empty("openai"),
    dsi: async () => { otherAdapterCalled = true; return { providers: [{ name: "DSI Fiber" }] }; },
    area: async () => { otherAdapterCalled = true; return { providers: [{ name: "Area ISP" }] }; },
  });
  assert.equal(result.winner, "none");
  assert.equal(result.providers.length, 0);
  assert.equal(otherAdapterCalled, false);
  assert.deepEqual(result.sources, { ai: "empty" });
});
