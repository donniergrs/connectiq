import test from "node:test";
import assert from "node:assert/strict";
import { composeSalesCloserFallback } from "../services/salesCloser/fallbackCloser.js";
import { buildSalesCloserContext } from "../services/salesCloser/contextBuilder.js";
import { resolveAdvisorMessage } from "../services/agentRuntime/responseResolver.js";

test("provider statement is acknowledged like a sales advisor", () => {
  const message = composeSalesCloserFallback({
    message: "i currently have spectrum",
    memory: { facts: { currentProvider: "Spectrum" }, preferences: [], painPoints: [], householdNeeds: [] },
    providers: [{ name: "AT&T", technology: "Fiber" }],
  });
  assert.match(message, /currently with Spectrum/i);
  assert.doesNotMatch(message, /not enough verified information/i);
});

test("short confirmation advances discovery rather than falling back", () => {
  const message = composeSalesCloserFallback({
    message: "ok",
    memory: { facts: { currentProvider: "Spectrum" }, preferences: [], painPoints: [], householdNeeds: [] },
    providers: [],
  });
  assert.match(message, /how much|most like to improve/i);
});

test("sales closer context carries voice-ready channel and memory", () => {
  const context = buildSalesCloserContext({
    message: "I work from home",
    memory: { facts: { currentProvider: "Spectrum", monthlyBill: 115 }, householdNeeds: ["workFromHome"], recentTurns: [] },
    providers: [{ name: "Frontier", technology: "Fiber" }],
  });
  assert.equal(context.channel, "web_chat_and_elevenlabs_voice");
  assert.equal(context.customerProfile.currentProvider, "Spectrum");
  assert.equal(context.customerProfile.monthlyBill, 115);
});

test("advisor resolver cannot fall back to legacy canned templates", () => {
  const message = resolveAdvisorMessage({
    routerResult: { agent: { message: "Got it—you’re currently with Spectrum." } },
    enterprise: { message: "legacy" },
    legacyAdvisor: { message: "legacy" },
  });
  assert.equal(message, "Got it—you’re currently with Spectrum.");
});
