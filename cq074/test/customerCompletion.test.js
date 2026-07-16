import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCustomerCompletion,
  containsInternalAdvisorData,
  formatCustomerReference,
} from "../src/services/brain/customerCompletion.js";

test("formats a short branded customer reference", () => {
  assert.equal(formatCustomerReference("abc-123-def456"), "CIQ-DEF456");
});

test("builds a customer-safe completion payload", () => {
  const completion = buildCustomerCompletion({
    order: { id: "order123456", name: "Jamie", recommendedProvider: "AT&T Fiber" },
    recommendation: { displayName: "AT&T Fiber" },
    quote: {
      recommendedPlan: { name: "Fiber 1 Gig" },
      monthlyPrice: 85,
      pricing: { sourceLabel: "Planning estimate" },
    },
  });

  assert.equal(completion.customerName, "Jamie");
  assert.equal(completion.provider, "AT&T Fiber");
  assert.equal(completion.plan, "Fiber 1 Gig");
  assert.equal(completion.monthlyPrice, 85);
  assert.equal(containsInternalAdvisorData(completion), false);
});

test("does not expose advisor coaching or readiness fields", () => {
  const completion = buildCustomerCompletion({
    order: {
      id: "order123456",
      salesSummary: {
        advisorNotes: {
          readinessScore: 100,
          leadQuality: "High Opportunity",
          likelyObjection: "Price",
        },
      },
    },
  });

  assert.equal(completion.readinessScore, undefined);
  assert.equal(completion.leadQuality, undefined);
  assert.equal(completion.likelyObjection, undefined);
  assert.equal(containsInternalAdvisorData(completion), false);
});
