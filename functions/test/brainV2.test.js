import test from "node:test";
import assert from "node:assert/strict";
import { clearCustomerMemory } from "../services/toolRouter/customerMemoryService.js";
import { routeConversationTurn } from "../services/toolRouter/routerService.js";
import { buildAdvisorResponse } from "../services/aiAdvisor/responseBuilder.js";

const providers = [
  { name: "AT&T", technology: "Fiber", maxdown: 5000 },
  { name: "Spectrum", technology: "Cable", maxdown: 1000 },
  { name: "Frontier", technology: "Fiber", maxdown: 2000 },
];

async function turn(sessionId, message) {
  const routerResult = await routeConversationTurn({ sessionId, message, context: { providers } });
  return { routerResult, advisor: buildAdvisorResponse({ routerResult, providers }) };
}

test.beforeEach(() => clearCustomerMemory());

test("routes pricing instead of repeating recommendation", async () => {
  const id = "v2-pricing";
  await turn(id, "I have AT&T and pay $115. I want a lower bill because I work from home.");
  const result = await turn(id, "how much is it");
  assert.equal(result.routerResult.brainV2.selectedSkill, "PricingSkill");
  assert.match(result.advisor.message, /do not have a verified monthly price|estimated at/i);
  assert.doesNotMatch(result.advisor.message, /thanks for clarifying/i);
});

test("routes mobile question", async () => {
  const result = await turn("v2-mobile", "do you offer mobile service too");
  assert.equal(result.routerResult.brainV2.selectedSkill, "MobileSkill");
  assert.match(result.advisor.message, /mobile/i);
});

test("provider correction updates memory and excludes current provider", async () => {
  const id = "v2-correction";
  await turn(id, "I have AT&T and pay $115");
  const result = await turn(id, "I'm actually with Spectrum now");
  assert.equal(result.routerResult.memory.facts.currentProvider, "Spectrum");
  assert.equal(result.routerResult.brainV2.selectedSkill, "CorrectionSkill");
  assert.match(result.advisor.message, /updated your current provider to Spectrum/i);
  assert.doesNotMatch(result.advisor.message, /Spectrum is now the leading alternative/i);
});

test("extracts multi-fact discovery message", async () => {
  const result = await turn("v2-multi", "We stream Netflix constantly, have three kids, I work from home, Wi-Fi upstairs is awful, and I don't want to spend over 90.");
  const memory = result.routerResult.memory;
  assert.ok(memory.householdNeeds.includes("streaming"));
  assert.ok(memory.householdNeeds.includes("workFromHome"));
  assert.ok(memory.painPoints.includes("wifiCoverage"));
  assert.equal(memory.facts.monthlyBudget, 90);
  assert.ok(memory.preferences.includes("price"));
});

test("routes explanation, alternatives, and quote to distinct skills", async () => {
  const id = "v2-skills";
  await turn(id, "I am with Spectrum and care about price because I work from home");
  const why = await turn(id, "Why is AT&T recommended?");
  const alt = await turn(id, "Show alternatives");
  const quote = await turn(id, "Build my quote");
  assert.equal(why.routerResult.brainV2.selectedSkill, "ExplanationSkill");
  assert.equal(alt.routerResult.brainV2.selectedSkill, "ComparisonSkill");
  assert.equal(quote.routerResult.brainV2.selectedSkill, "QuoteSkill");
  assert.notEqual(why.advisor.message, alt.advisor.message);
  assert.notEqual(alt.advisor.message, quote.advisor.message);
});
