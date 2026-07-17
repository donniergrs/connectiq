import test from "node:test";
import assert from "node:assert/strict";
import { buildRecommendationStrategy } from "../src/services/salesBrain/recommendationObjectionEngine.js";

test("builds a plain-language recommendation from customer context",()=>{const s=buildRecommendationStrategy({salesDiscovery:{primaryPainPoint:"outages",householdUsage:["Remote work"],switchTimeline:"this week"},recommendation:{provider:"AT&T Fiber",plan:"Fiber 500",monthlyPrice:65}});assert.match(s.recommendation.explanation,/AT&T Fiber/);assert.equal(s.stage,"ready");assert.equal(s.close.nextAction,"Prepare order");});
test("selects happy-customer objection when satisfaction is high",()=>{const s=buildRecommendationStrategy({salesDiscovery:{satisfaction:5},recommendation:{provider:"Spectrum"}});assert.equal(s.primaryObjection.key,"happy");});
test("selects price concern when recommendation costs more",()=>{const s=buildRecommendationStrategy({salesDiscovery:{monthlyBill:60},recommendation:{provider:"FiberCo",monthlyPrice:80}});assert.equal(s.primaryObjection.key,"expensive");});
test("includes safety guardrails",()=>{const s=buildRecommendationStrategy({});assert.ok(s.guardrails.some((x)=>x.includes("Do not guarantee")));assert.ok(s.objections.length>=6);});
