import test from "node:test";
import assert from "node:assert/strict";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [
  { brand_name: "EarthLink", technology_code_type: "Fiber", startingPrice: 60 },
  { brand_name: "Xfinity", technology_code_type: "Cable", startingPrice: 55 },
  { brand_name: "T-Mobile", technology_code_type: "Fixed Wireless", startingPrice: 50 },
];

const memory = {
  facts: { currentProvider: "Spectrum", customerName: "Donnie", decisionPriority: "reliability" },
  preferences: ["reliability"],
  painPoints: [],
  householdNeeds: ["workFromHome"],
  rejectedProviders: [],
  lastNextAction: "ask_primary_motivation",
};

test("PC2.1 recommendation request asks monthly bill when discovery is incomplete", () => {
  const result = orchestrateSalesResponse({ message: "what do you recommend?", memory, providers });
  assert.equal(result.nextAction, "ask_monthly_bill");
});

test("PC2.1 why-provider answer identifies the leader then asks issue type", () => {
  const result = orchestrateSalesResponse({ message: "why EarthLink?", memory, providers });
  assert.equal(result.nextAction, "ask_issue_type");
  assert.match(result.message, /EarthLink is currently leading/i);
});
