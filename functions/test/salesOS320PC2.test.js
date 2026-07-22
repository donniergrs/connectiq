import test from "node:test";
import assert from "node:assert/strict";
import { discoveryAcknowledgement } from "../services/salesOS/consultantStyle.js";
import { rankProviders } from "../services/salesOS/providerEngine.js";
import { orchestrateSalesResponse } from "../services/salesOrchestrator/index.js";

const providers = [
  { provider_name: "AT&T", technology_code_type: "Fiber", monthlyPrice: 65 },
  { provider_name: "AT&T Fiber", technology_code_type: "Fiber", monthlyPrice: 65 },
  { provider_name: "Xfinity", technology_code_type: "Cable", monthlyPrice: 55 },
  { provider_name: "T-Mobile", technology_code_type: "Fixed Wireless", monthlyPrice: 50 },
  { provider_name: "Spectrum", technology_code_type: "Cable", monthlyPrice: 80 },
];

test("PC2 consultant acknowledgement tolerates incomplete profile sets", () => {
  assert.doesNotThrow(() => discoveryAcknowledgement({ facts: { currentProvider: "AT&T", monthlyBill: 110 } }, "ask_name"));
});

test("PC2 current provider top-level fallback excludes provider family", () => {
  const ranked = rankProviders(providers, { currentProvider: "AT&T", rejectedProviders: [] });
  assert.equal(ranked.some((item) => /AT&T/i.test(item.name)), false);
});

test("PC2 pricing comparison preserves legacy and new wording", () => {
  const memory = {
    facts: { currentProvider: "Spectrum", customerName: "Donnie", monthlyBill: 85, decisionPriority: "reliability", switchIntent: "immediately" },
    preferences: ["reliability"], painPoints: ["reliability"], householdNeeds: ["gaming", "streaming"], rejectedProviders: [], lastNextAction: "present_options",
  };
  const result = orchestrateSalesResponse({ message: "pricing", memory, providers });
  assert.equal(result.selectedProviderName, null);
  assert.match(result.message, /compare the top options by pricing/i);
  assert.match(result.message, /strongest alternatives/i);
});

test("PC2 closing uses standardized current-provider summary", () => {
  const memory = {
    facts: {
      currentProvider: "AT&T", customerName: "Phyllis", monthlyBill: 115,
      decisionPriority: "price", switchIntent: "immediately", email: "p@example.com",
      phone: "8645551212", contactPreference: "phone", bestContactTime: "as soon as possible",
      followUpPermission: true,
    },
    preferences: ["price"], painPoints: ["price"], householdNeeds: ["workFromHome", "streaming"],
    selectedProvider: { name: "Spectrum" }, rejectedProviders: [], lastNextAction: "ask_followup_permission",
  };
  const result = orchestrateSalesResponse({ message: "yes", memory, providers });
  assert.match(result.message, /current provider as AT&T/i);
  assert.match(result.message, /call you as soon as possible/i);
});

test("PC2 why-provider answer asks issue before bill when issue is unknown", () => {
  const memory = {
    facts: { currentProvider: "Spectrum", customerName: "Donnie", decisionPriority: "price" },
    preferences: ["price"], painPoints: [], householdNeeds: [], rejectedProviders: [], lastNextAction: "ask_primary_motivation",
  };
  const result = orchestrateSalesResponse({ message: "why Xfinity?", memory, providers });
  assert.equal(result.nextAction, "ask_issue_type");
});
