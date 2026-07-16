import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesSummary } from "../src/services/brain/salesSummary.js";

const base = {
  customer: { name: "Jamie Smith", email: "jamie@example.com", phone: "8645551212", consent: true },
  address: "101 Main St, Greenville, SC 29601",
  needs: { people: 4, devices: 18, budget: 100, priority: "reliability", workFromHome: true, streaming: true },
  recommendation: {
    id: "att",
    displayName: "AT&T Fiber",
    technology: "Fiber",
    advisorScore: 94,
    recommendationReasons: ["Fiber fits remote work.", "Strong upload performance."],
  },
  quote: {
    quoteId: "quote-1",
    quoteVersion: "3D-1.0",
    status: "Estimate",
    recommendedPlan: { name: "Fiber 1 Gig" },
    monthlyPrice: 85,
    download: 1000,
    upload: 1000,
    pricing: { sourceLabel: "Planning estimate", amount: 85 },
    installation: { method: "Technician visit", estimatedWindow: "Provider scheduling required" },
    reasons: ["Supports remote work.", "Fits the selected budget."],
    disclaimer: "Final price requires confirmation.",
  },
  providers: [
    { id: "att", displayName: "AT&T Fiber", advisorScore: 94, technology: "Fiber" },
    { id: "spectrum", displayName: "Spectrum", advisorScore: 83, technology: "Cable" },
  ],
  conversation: [
    { role: "customer", text: "Can I keep my phone number?" },
    { role: "advisor", text: "Porting requires provider verification." },
  ],
};

test("builds a complete CRM-ready sales summary", () => {
  const summary = buildSalesSummary(base);
  assert.equal(summary.customer.name, "Jamie Smith");
  assert.equal(summary.recommendation.provider, "AT&T Fiber");
  assert.equal(summary.quote.monthlyPrice, 85);
  assert.equal(summary.exportPayload.schema, "connectiq.sales-summary.v1");
  assert.equal(summary.exportPayload.nextAction, summary.advisorNotes.nextAction);
});

test("assigns a high readiness score to a complete qualified lead", () => {
  const summary = buildSalesSummary(base);
  assert.equal(summary.advisorNotes.readinessScore, 100);
  assert.equal(summary.advisorNotes.readinessStatus, "Ready for Advisor");
  assert.equal(summary.advisorNotes.leadQuality, "High Opportunity");
});

test("reduces readiness when contact and consent data are missing", () => {
  const summary = buildSalesSummary({ ...base, customer: { name: "Jamie", email: "", phone: "", consent: false } });
  assert.ok(summary.advisorNotes.readinessScore < 90);
  assert.notEqual(summary.advisorNotes.readinessStatus, "Ready for Advisor");
});

test("identifies price sensitivity as the likely objection", () => {
  const summary = buildSalesSummary({ ...base, needs: { ...base.needs, priority: "price", budget: 70 } });
  assert.match(summary.advisorNotes.likelyObjection, /cost|price/i);
});

test("includes the next-best provider in the recommendation export", () => {
  const summary = buildSalesSummary(base);
  assert.equal(summary.recommendation.nextBest.provider, "Spectrum");
  assert.equal(summary.recommendation.nextBest.matchScore, 83);
});

test("summarizes recent customer questions for advisor context", () => {
  const summary = buildSalesSummary(base);
  assert.match(summary.conversation.summary, /phone number/i);
  assert.equal(summary.conversation.messageCount, 2);
});
