import test from "node:test";
import assert from "node:assert/strict";
import { executeProviderWaterfall } from "../functions/services/providerIntelligenceService.js";

const empty = (status) => async (_address, trace) => { trace.push({ source: status, status: "empty" }); return { status: "empty", providers: [] }; };

test("waterfall stops after FCC returns verified providers", async () => {
  let dsiCalled = false;
  let aiCalled = false;
  const result = await executeProviderWaterfall("1 Main St", {
    bdc: empty("bdc"),
    fcc: async () => ({ status: "verified", providers: [{ name: "FCC Fiber", verified: true }] }),
    dsi: async () => { dsiCalled = true; return { providers: [] }; },
    ai: async () => { aiCalled = true; return { candidates: [] }; },
  });
  assert.equal(result.winner, "fcc-public-api");
  assert.equal(dsiCalled, false);
  assert.equal(aiCalled, false);
});

test("waterfall moves from FCC to DSI", async () => {
  let aiCalled = false;
  const result = await executeProviderWaterfall("1 Main St", {
    bdc: empty("bdc"), fcc: empty("fcc"),
    dsi: async () => ({ status: "verified", providers: [{ name: "DSI Cable", verified: true }] }),
    ai: async () => { aiCalled = true; return { candidates: [] }; },
  });
  assert.equal(result.winner, "dsi");
  assert.equal(aiCalled, false);
});

test("waterfall reaches AI when verified sources are empty", async () => {
  const result = await executeProviderWaterfall("1 Main St", {
    bdc: empty("bdc"), fcc: empty("fcc"), dsi: empty("dsi"),
    ai: async () => ({ status: "candidates_found", candidates: [{ name: "Possible ISP", verified: false }] }),
  });
  assert.equal(result.winner, "ai-research");
  assert.equal(result.verified.providers.length, 0);
  assert.equal(result.ai.candidates[0].verified, false);
});
