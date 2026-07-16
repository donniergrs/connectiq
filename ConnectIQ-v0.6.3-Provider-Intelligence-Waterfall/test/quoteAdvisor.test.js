import test from "node:test";
import assert from "node:assert/strict";
import { answerQuoteQuestion, detectQuoteIntent } from "../src/services/brain/quote/quoteAdvisor.js";

const provider = {
  id: "att",
  displayName: "AT&T Fiber",
  technology: "Fiber",
  advisorScore: 96,
  download: 5000,
  upload: 5000,
};

const baseContext = {
  recommendation: provider,
  providers: [provider, { id: "spectrum", displayName: "Spectrum", technology: "Cable", advisorScore: 84, download: 1000, upload: 35 }],
  needs: { people: 4, devices: 18, workFromHome: true, streaming: true, gaming: true, priority: "reliability", budget: 100 },
  quote: {
    provider: "AT&T Fiber",
    productName: "Fiber 1 Gig",
    recommendedPlan: { id: "fiber-1000", name: "Fiber 1 Gig", download: 1000, upload: 1000, estimatedMonthlyPrice: 80 },
    download: 1000,
    upload: 1000,
    monthlyPrice: 80,
    pricing: { amount: 80, estimated: true },
    reasons: ["1000 Mbps estimated upload capacity supports video calls and cloud work.", "The recommended speed tier leaves room for gaming while other devices are active."],
  },
  conversation: [],
};

test("detects plan explanation intent", () => {
  assert.equal(detectQuoteIntent("Why did you recommend the 1 Gig plan?", baseContext), "why-plan");
});

test("explains the selected plan using quote and household context", () => {
  const answer = answerQuoteQuestion("Why this plan?", baseContext);
  assert.match(answer, /Fiber 1 Gig/);
  assert.match(answer, /18 connected devices/);
  assert.match(answer, /provider confirmation/i);
});

test("compares a slower plan and explains savings tradeoff", () => {
  const answer = answerQuoteQuestion("Would 500 Mbps be enough and save money?", baseContext);
  assert.match(answer, /Fiber 500/);
  assert.match(answer, /save/i);
  assert.match(answer, /headroom|capacity/i);
});

test("rejects unnecessary faster tier without promising exact value", () => {
  const answer = answerQuoteQuestion("Why not 2 Gig?", baseContext);
  assert.match(answer, /Fiber 2 Gig/);
  assert.match(answer, /does not show a clear need/i);
});

test("answers a customer-supplied budget against the current quote", () => {
  const answer = answerQuoteQuestion("My budget is only $70", baseContext);
  assert.match(answer, /Fiber 500/);
  assert.match(answer, /\$65/);
});

test("advises on future device growth", () => {
  const answer = answerQuoteQuestion("What if I add more smart home devices later?", baseContext);
  assert.match(answer, /room for growth|next tier|headroom/i);
});

test("compares the next best provider using ranked context", () => {
  const answer = answerQuoteQuestion("What about Spectrum?", baseContext);
  assert.match(answer, /Spectrum/);
  assert.match(answer, /84\/100/);
  assert.match(answer, /AT&T Fiber/);
});

test("uses recent conversation to resolve a short follow-up", () => {
  const context = {
    ...baseContext,
    conversation: [{ role: "advisor", text: "Fiber 500 may save money, but it provides less headroom." }],
  };
  assert.equal(detectQuoteIntent("What about that?", context), "slower");
});
