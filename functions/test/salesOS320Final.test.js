import test from "node:test";
import assert from "node:assert/strict";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [
  { provider_name: "EarthLink", technology_code_type: "Fiber" },
  { provider_name: "Spectrum", technology_code_type: "Cable" },
  { provider_name: "Xfinity", technology_code_type: "Cable" },
];

test("Final: why did you pick phrasing preserves monthly-bill discovery", () => {
  const memory = {
    facts: { currentProvider: "AT&T", customerName: "Phyllis", preferredName: "Phyllis" },
    preferences: ["price"], painPoints: ["price"], householdNeeds: [],
  };
  const result = orchestrateSalesResponse({ message: "why did you pick Spectrum", memory, providers });
  assert.equal(result.stage, "DISCOVERY");
  assert.equal(result.nextAction, "ask_monthly_bill");
});

test("Final: concise why-provider phrasing continues issue diagnostics", () => {
  const memory = {
    facts: { currentProvider: "Spectrum", customerName: "Donnie", decisionPriority: "price" },
    preferences: ["price"], painPoints: [], householdNeeds: [],
  };
  const result = orchestrateSalesResponse({ message: "why Xfinity?", memory, providers });
  assert.equal(result.stage, "DISCOVERY");
  assert.equal(result.nextAction, "ask_issue_type");
});
