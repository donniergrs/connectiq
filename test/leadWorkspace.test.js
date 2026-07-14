import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadTimeline, buildLeadWorkspace, leadHealth, leadRecommendation } from "../src/services/leadWorkspace.js";

const lead = {
  id: "lead-502",
  name: "Jamie Smith",
  email: "jamie@example.com",
  phone: "8645551212",
  address: "101 Main St, Greenville, SC",
  consent: true,
  status: "Ready for Advisor",
  readinessScore: 96,
  leadQuality: "High Opportunity",
  needs: { people: 4, devices: 18, budget: 100, priority: "reliability", workFromHome: true, streaming: true },
  salesSummary: {
    household: { people: 4, devices: 18, budget: 100, priority: "reliability", usage: ["Remote work", "Streaming"] },
    recommendation: {
      provider: "AT&T Fiber",
      plan: "Fiber 1 Gig",
      technology: "Fiber",
      matchScore: 94,
      confidence: 91,
      download: 1000,
      upload: 1000,
      reasons: ["Supports remote work."],
      nextBest: { provider: "Spectrum", matchScore: 82, technology: "Cable" },
    },
    quote: { monthlyPrice: 85, installationMethod: "Technician visit", installationWindow: "Provider scheduling required" },
    conversation: { summary: "Customer values reliability and asked about number porting." },
    advisorNotes: {
      likelyObjection: "Monthly cost",
      primarySellingPoint: "Symmetrical upload performance",
      nextAction: "Call customer",
      suggestedTalkingPoints: ["Confirm current promotion."],
    },
  },
  createdAt: "2026-07-13T14:00:00.000Z",
  activity: [{ type: "Advisor Update", status: "Contacted", note: "Left voicemail.", createdAt: "2026-07-13T16:00:00.000Z" }],
};

test("builds a complete lead workspace from nested sales intelligence", () => {
  const workspace = buildLeadWorkspace(lead);
  assert.equal(workspace.customer.name, "Jamie Smith");
  assert.equal(workspace.recommendation.provider, "AT&T Fiber");
  assert.equal(workspace.recommendation.plan, "Fiber 1 Gig");
  assert.equal(workspace.coaching.nextAction, "Call customer");
  assert.equal(workspace.quality, "High Opportunity");
});

test("normalizes recommendation and quote details", () => {
  const recommendation = leadRecommendation(lead);
  assert.equal(recommendation.monthlyPrice, 85);
  assert.equal(recommendation.matchScore, 94);
  assert.equal(recommendation.nextBest.provider, "Spectrum");
});

test("calculates record health and missing information", () => {
  assert.deepEqual(leadHealth(lead), { score: 100, missing: [] });
  const incomplete = leadHealth({ name: "Jamie" });
  assert.ok(incomplete.score < 100);
  assert.ok(incomplete.missing.includes("email"));
  assert.ok(incomplete.missing.includes("provider recommendation"));
});

test("builds a reverse chronological opportunity timeline", () => {
  const timeline = buildLeadTimeline(lead);
  assert.ok(timeline.length >= 2);
  assert.equal(timeline[0].type, "Contacted");
  assert.ok(timeline[0].date >= timeline[timeline.length - 1].date);
});

test("falls back gracefully for legacy leads", () => {
  const workspace = buildLeadWorkspace({ id: "legacy", name: "Legacy Lead", recommendedProvider: "Spectrum", quote: { productName: "Internet 500", monthlyPrice: 60 } });
  assert.equal(workspace.recommendation.provider, "Spectrum");
  assert.equal(workspace.recommendation.plan, "Internet 500");
  assert.match(workspace.conversationSummary, /qualification flow/i);
});
