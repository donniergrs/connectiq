import test from "node:test";
import assert from "node:assert/strict";
import { buildDsiSubmissionPackage, buildLaunchReadiness, dsiPackageToCsv } from "../src/services/productionLaunchService.js";

const readyLead = {
  id: "lead-1", customerName: "Taylor", address: "101 Main St", phone: "555-0100",
  currentProvider: "Spectrum", monthlyBill: 115, painPoints: ["lower bill"],
  availableProviders: [{ name: "AT&T Fiber" }], recommendedProvider: "AT&T Fiber",
  selectedPlan: "Fiber 500", monthlyPrice: 65, quoteId: "q1", orderReadinessScore: 100,
  status: "Completed",
};

const environment = { config: { projectId: "connectiq", apiKey: "key", appId: "app" }, firestoreConnected: true, domain: "www.getconnectiq.com", online: true };

test("production launch becomes ready after critical gates pass", () => {
  const result = buildLaunchReadiness({ ...environment, leads: [readyLead] });
  assert.equal(result.launchReady, true);
  assert.equal(result.criticalBlockers.length, 0);
});

test("localhost blocks the production hosting gate", () => {
  const result = buildLaunchReadiness({ ...environment, domain: "localhost", leads: [readyLead] });
  assert.equal(result.launchReady, false);
  assert.ok(result.criticalBlockers.some((gate) => gate.id === "hosting"));
});

test("failed transaction statuses are surfaced", () => {
  const result = buildLaunchReadiness({ ...environment, leads: [readyLead, { id: "bad", status: "Submission Failed" }] });
  assert.equal(result.metrics.failed, 1);
});

test("builds a normalized DSI submission package", () => {
  const pkg = buildDsiSubmissionPackage(readyLead);
  assert.equal(pkg.customer.serviceAddress, "101 Main St");
  assert.equal(pkg.service.provider, "AT&T Fiber");
  assert.equal(pkg.service.monthlyPrice, 65);
});

test("DSI CSV safely quotes customer fields", () => {
  const pkg = buildDsiSubmissionPackage({ ...readyLead, customerName: 'Taylor "TJ"' });
  const csv = dsiPackageToCsv(pkg);
  assert.match(csv, /"Taylor ""TJ"""/);
  assert.match(csv, /"AT&T Fiber"/);
});
