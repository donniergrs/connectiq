import test from "node:test";
import assert from "node:assert/strict";
import { initializeToolRouter, routeConversationTurn, routerDiagnostics } from "../services/toolRouter/index.js";

test("registers the default tool set", () => {
  const health = initializeToolRouter();
  assert.equal(health.ok, true);
  assert.ok(health.registry.registered >= 6);
});

test("routes one message through multiple tools and learns customer facts", async () => {
  const result = await routeConversationTurn({
    sessionId: "test-session-1",
    message: "I am paying $140 with Spectrum and my Wi-Fi keeps dropping during video calls.",
    stage: "DISCOVERY",
  });
  assert.equal(result.ok, true);
  assert.ok(result.toolsInvoked.includes("discovery"));
  assert.ok(result.toolsInvoked.includes("leadQualification"));
  assert.equal(result.memory.facts.currentProvider, "Spectrum");
  assert.equal(result.memory.facts.monthlyBill, 140);
  assert.ok(result.memory.painPoints.includes("reliability"));
  assert.ok(result.memory.householdNeeds.includes("workFromHome"));
});

test("detects order readiness and records diagnostics", async () => {
  const result = await routeConversationTurn({
    sessionId: "test-session-2",
    message: "I have Verizon and I am ready to move forward with the order.",
    stage: "CLOSING",
  });
  assert.ok(result.toolsInvoked.includes("orderReadiness"));
  const diagnostics = routerDiagnostics({ sessionId: "test-session-2" });
  assert.ok(diagnostics.decisions.length >= 1);
  assert.ok(diagnostics.turns.length >= 1);
});
