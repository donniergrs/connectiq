import test from "node:test";
import assert from "node:assert/strict";
import { activeAdvisors, advisorAssignment, normalizeAdvisor } from "../src/services/salesTeam.js";
import { createJournalEvent } from "../src/services/opportunityJournal.js";

test("normalizes and filters active sales advisors", () => {
  const advisors = activeAdvisors([{ id: "2", name: "Zed", active: false }, { id: "1", name: "Amy", email: "a@example.com", role: "Sales Manager", active: true }]);
  assert.equal(advisors.length, 1);
  assert.equal(advisors[0].name, "Amy");
  assert.equal(advisors[0].role, "Sales Manager");
});

test("builds an attributable lead assignment payload", () => {
  const payload = advisorAssignment(normalizeAdvisor({ id: "advisor-1", name: "Sarah", email: "s@example.com" }), { uid: "manager-1", displayName: "Donnie" }, new Date("2026-07-14T10:00:00Z"));
  assert.equal(payload.uid, "advisor-1");
  assert.equal(payload.name, "Sarah");
  assert.equal(payload.assignedBy.name, "Donnie");
  assert.equal(payload.assignedAt, "2026-07-14T10:00:00.000Z");
});

test("pipeline and assignment journal events preserve audit metadata", () => {
  const event = createJournalEvent({ type: "pipeline_stage_change", title: "Pipeline stage changed", description: "New → Contacted", createdBy: { id: "1", name: "Donnie" }, metadata: { fromStatus: "New", toStatus: "Contacted" }, createdAt: new Date("2026-07-14T11:00:00Z") });
  assert.equal(event.type, "pipeline_stage_change");
  assert.equal(event.metadata.toStatus, "Contacted");
  assert.equal(event.createdBy.name, "Donnie");
});
