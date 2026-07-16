import test from "node:test";
import assert from "node:assert/strict";
import { answerKnowledgeQuestion } from "../src/services/brain/knowledgeBase.js";

const providers = [
  {
    displayName: "AT&T Fiber",
    technology: "Fiber to the Premises",
    download: 1000,
    upload: 1000,
    advisorScore: 96,
    recommendationReasons: ["Fiber is the strongest reliability and upload option available at this address.", "1000 Mbps upload supports video calls, cloud work, and file sharing."],
  },
  {
    displayName: "Spectrum",
    technology: "Cable",
    download: 1000,
    upload: 35,
    advisorScore: 82,
  },
];

const context = {
  providers,
  recommendation: providers[0],
  needs: { workFromHome: true, gaming: true, devices: 24, budget: 100 },
  quote: { provider: "AT&T Fiber", monthlyPrice: 85 },
};

test("explains the recommendation using customer context", () => {
  const answer = answerKnowledgeQuestion("Why are you recommending AT&T?", context);
  assert.match(answer, /AT&T Fiber/);
  assert.match(answer, /96\/100/);
  assert.match(answer, /upload|reliability/i);
});

test("compares a mentioned alternative with the top recommendation", () => {
  const answer = answerKnowledgeQuestion("Why not Spectrum instead?", context);
  assert.match(answer, /Spectrum/);
  assert.match(answer, /AT&T Fiber/);
  assert.match(answer, /82\/100/);
});

test("does not overstate phone-number porting eligibility", () => {
  const answer = answerKnowledgeQuestion("Can I keep my phone number?", context);
  assert.match(answer, /often possible/i);
  assert.match(answer, /must be verified/i);
});

test("uses the current quote for price questions", () => {
  const answer = answerKnowledgeQuestion("How much will it cost each month?", context);
  assert.match(answer, /\$85\.00/);
  assert.match(answer, /confirmed/i);
});

test("grounds gaming advice in available providers", () => {
  const answer = answerKnowledgeQuestion("Which provider is best for gaming?", context);
  assert.match(answer, /AT&T Fiber/);
  assert.match(answer, /gaming/i);
});

test("explains fiber versus cable without making provider-specific promises", () => {
  const answer = answerKnowledgeQuestion("Is fiber better than cable?", context);
  assert.match(answer, /Fiber generally/i);
  assert.match(answer, /Cable/i);
});


test("phone-number intent wins when a provider name contains Phone", () => {
  const wow = {
    displayName: "WOW Internet, Cable & Phone",
    technology: "Fiber",
    download: 5000,
    upload: 5000,
    advisorScore: 83,
  };
  const wowContext = { ...context, providers: [...providers, wow] };
  const answer = answerKnowledgeQuestion("Can I keep my phone number?", wowContext);
  assert.match(answer, /often possible/i);
  assert.match(answer, /must be verified/i);
  assert.doesNotMatch(answer, /valid option/i);
});
