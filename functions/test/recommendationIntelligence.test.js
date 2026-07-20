import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecommendations, runTestHarness } from "../services/recommendationIntelligence/index.js";

test("uses 60 percent business and 40 percent customer fit weighting", () => {
  const result = evaluateRecommendations({ customerProfile:{workFromHome:true}, providers:[
    {name:"A",technology:"Fiber",downloadMbps:1000,uploadMbps:1000,lowLatency:true,economics:{oneTimeCommission:100}},
    {name:"B",technology:"Cable",downloadMbps:1000,uploadMbps:50,lowLatency:true,economics:{oneTimeCommission:300,spiff:200}},
  ]});
  assert.equal(result.configuration.weights.business, .60);
  assert.equal(result.configuration.weights.customerFit, .40);
  assert.ok(result.rankedProviders.every(x=>Number.isFinite(x.finalScore)));
});

test("rejects invalid weight totals", () => {
  assert.throws(()=>evaluateRecommendations({providers:[{name:"A"}],config:{weights:{business:.7,customerFit:.4}}}),/total 1.0/);
});

test("test harness runs", () => { const runs=runTestHarness(); assert.ok(runs.length>=2); assert.ok(runs.every(x=>x.result.ok)); });
