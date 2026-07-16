import test from "node:test";
import assert from "node:assert/strict";
import { executeProviderWaterfall } from "../functions/services/providerIntelligenceService.js";

const empty = (source) => async (_address, trace) => { trace.push({ source, status: "empty" }); return { status: "empty", providers: [] }; };

test("waterfall stops after OpenAI returns provider candidates", async () => {
  let dsiCalled = false;
  const result = await executeProviderWaterfall("1 Main St", {
    ai: async () => ({ status: "suggested", providers: [{ name: "Possible ISP", verified: false }] }),
    dsi: async () => { dsiCalled = true; return { providers: [] }; },
  });
  assert.equal(result.winner, "openai");
  assert.equal(dsiCalled, false);
  assert.equal(result.providers[0].verified, false);
});

test("waterfall reaches DSI when OpenAI is empty", async () => {
  const result = await executeProviderWaterfall("1 Main St", {
    ai: empty("openai"),
    dsi: async () => ({ status: "verified", providers: [{ name: "DSI Fiber", verified: true }] }),
  });
  assert.equal(result.winner, "dsi");
  assert.equal(result.providers[0].verified, true);
});

test("waterfall returns none when OpenAI DSI and area intelligence are empty", async () => {
  const result = await executeProviderWaterfall("1 Main St", {
    ai: empty("openai"),
    dsi: empty("dsi"),
    area: empty("area"),
  });
  assert.equal(result.winner, "none");
  assert.equal(result.providers.length, 0);
});

test("waterfall uses curated area intelligence only after OpenAI and DSI are empty", async () => {
  const result = await executeProviderWaterfall("101 Plum Creek Ln Greenville SC 29607", {
    ai: empty("openai"),
    dsi: empty("dsi"),
    area: async () => ({ status: "suggested", providers: [{ name: "AT&T", verified: false }] }),
  });
  assert.equal(result.winner, "connectiq-area-intelligence");
  assert.equal(result.providers[0].name, "AT&T");
});
