import test from "node:test";
import assert from "node:assert/strict";
import { buildDsiOrderSummary, buildOrderDraft, evaluateOrderReadiness } from "../src/services/orderIQService.js";

test("OrderIQ builds a draft from recommendation and quote", () => {
  const draft = buildOrderDraft({ lead: { id: "lead-1", phone: "8645551212", consent: true }, workspace: { customer: { name: "Alex", email: "a@example.com", address: "1 Main St" }, recommendation: { provider: "FiberCo", plan: "Gig", monthlyPrice: 70 } }, quote: { quoteId: "q1", offer: { provider: "Quote Fiber", plan: "2 Gig", monthlyPrice: 90 } } });
  assert.equal(draft.provider, "Quote Fiber");
  assert.equal(draft.plan, "2 Gig");
  assert.equal(draft.quoteId, "q1");
});

test("OrderIQ identifies missing required fields", () => {
  const result = evaluateOrderReadiness({ customerName: "Alex" });
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes("Phone number"));
  assert.ok(result.score < 100);
});

test("OrderIQ marks a complete record ready", () => {
  const order = { customerName:"Alex",phone:"8645551212",email:"a@example.com",serviceAddress:"1 Main St",provider:"FiberCo",plan:"Gig",monthlyPrice:70,contactPreference:"Phone",consentConfirmed:true };
  const result = evaluateOrderReadiness(order);
  assert.equal(result.ready, true);
  assert.equal(result.score, 100);
  assert.match(buildDsiOrderSummary(order, result), /READY TO SUBMIT/);
});
