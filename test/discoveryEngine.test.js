import test from "node:test";
import assert from "node:assert/strict";
import { buildDiscoveryPlan, scoreDiscovery } from "../src/services/salesBrain/discoveryEngine.js";

test("asks permission first for a new lead", () => {
  const plan = buildDiscoveryPlan({});
  assert.equal(plan.next.field, "permissionToContinue");
});

test("high pain and near-term timeline create a high priority lead", () => {
  const scoring = scoreDiscovery({ permissionToContinue:true,currentProvider:"Spectrum",monthlyBill:125,satisfaction:1,primaryPainPoint:"Outages and high bill",householdUsage:["Working from home"],switchTimeline:"This week",preferredContact:"Text",bestContactTime:"After 5" });
  assert.ok(scoring.score >= 75);
  assert.equal(scoring.priority, "Urgent");
  assert.ok(scoring.reasons.length >= 4);
});

test("completed discovery advances to recommendation", () => {
  const plan = buildDiscoveryPlan({ aiSales:{ discovery:{ permissionToContinue:true,currentProvider:"Spectrum",monthlyBill:110,satisfaction:2,primaryPainPoint:"Reliability",householdUsage:["Streaming"],people:4,devices:12,switchTimeline:"Within 30 days",preferredContact:"Text",bestContactTime:"Friday after 5",contractStatus:"No contract" }}});
  assert.equal(plan.complete, true);
  assert.equal(plan.next.field, "complete");
});
