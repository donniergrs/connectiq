import test from "node:test";
import assert from "node:assert/strict";
import { CustomerTwinService } from "../services/customerTwin/service.js";

test("creates a versioned customer digital twin", async () => {
  const service = new CustomerTwinService();
  const twin = await service.create({
    customerId: "customer-001",
    sessionId: "session-001",
    channel: "web",
  });

  assert.equal(twin.id, "customer-001");
  assert.equal(twin.schemaVersion, "1.0.0");
  assert.equal(twin.version, 1);
});

test("stores explicit facts with evidence and confidence", async () => {
  const service = new CustomerTwinService();
  const result = await service.updateFacts({
    customerId: "customer-002",
    facts: [{
      domain: "currentService",
      key: "currentProvider",
      value: "Spectrum",
      source: "explicit",
      evidence: "I currently have Spectrum.",
    }],
  });

  const fact = result.twin.understanding.currentService.currentProvider;
  assert.equal(fact.value, "Spectrum");
  assert.equal(fact.confidence, 0.99);
  assert.equal(fact.source, "explicit");
  assert.deepEqual(fact.evidence, ["I currently have Spectrum."]);
});

test("preserves stronger explicit evidence over weaker inference", async () => {
  const service = new CustomerTwinService();
  await service.updateFacts({
    customerId: "customer-003",
    facts: [{
      domain: "usage",
      key: "workFromHome",
      value: true,
      source: "explicit",
      confidence: 0.99,
    }],
  });

  const result = await service.updateFacts({
    customerId: "customer-003",
    facts: [{
      domain: "usage",
      key: "workFromHome",
      value: false,
      source: "inferred",
      confidence: 0.55,
    }],
  });

  assert.equal(result.twin.understanding.usage.workFromHome.value, true);
});

test("updates recommendation readiness as facts accumulate", async () => {
  const service = new CustomerTwinService();
  const result = await service.updateFacts({
    customerId: "customer-004",
    facts: [
      { domain: "currentService", key: "currentProvider", value: "Spectrum", source: "explicit" },
      { domain: "budget", key: "monthlyBill", value: 140, source: "explicit" },
      { domain: "goals", key: "primaryPriority", value: "reliability", source: "explicit" },
      { domain: "usage", key: "internetUsage", value: "heavy", source: "explicit" },
      { domain: "household", key: "remoteWorkers", value: 1, source: "explicit" },
    ],
  });

  assert.equal(result.readiness.ready, true);
  assert.equal(result.twin.recommendation.readiness, "READY");
});
