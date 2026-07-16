import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadPipeline, normalizePipelineLead, pipelineStageId } from "../src/domains/lead/pipeline/pipelineService.js";

const leads = [
  { id: "a", name: "A", status: "New Lead", estimatedMonthlyPrice: 80, readinessScore: 90, leadQuality: "High Opportunity", salesSummary: { recommendation: { matchScore: 94, provider: "AT&T Fiber", plan: "Fiber 1 Gig" } }, createdAt: "2026-07-13T10:00:00Z" },
  { id: "b", name: "B", status: "Contacted", estimatedMonthlyPrice: 60, readinessScore: 70, leadQuality: "Medium Opportunity", salesSummary: { recommendation: { matchScore: 84, provider: "Spectrum", plan: "Internet 500" } }, followUpDate: "2020-01-01T10:00:00Z", createdAt: "2026-07-13T11:00:00Z" },
  { id: "c", name: "C", status: "Order Submitted", estimatedMonthlyPrice: 100, readinessScore: 98, leadQuality: "High Opportunity", salesSummary: { recommendation: { matchScore: 96, provider: "AT&T Fiber", plan: "Fiber 2 Gig" } }, createdAt: "2026-07-13T12:00:00Z" },
];

test("maps legacy and current statuses into pipeline stages", () => {
  assert.equal(pipelineStageId({ status: "New Lead" }), "new");
  assert.equal(pipelineStageId({ status: "Proposal Sent" }), "quoted");
  assert.equal(pipelineStageId({ status: "Commission Paid" }), "installed");
  assert.equal(pipelineStageId({ status: "Unknown status" }), "new");
});

test("normalizes pipeline card intelligence", () => {
  const lead = normalizePipelineLead({ ...leads[0], assignedAdvisorName: "Donnie", opportunityJournal: [{ createdAt: "2026-07-13T13:00:00Z" }] });
  assert.equal(lead.owner, "Donnie");
  assert.equal(lead.stageId, "new");
  assert.equal(lead.matchScore, 94);
  assert.ok(lead.lastActivityDate instanceof Date);
});

test("groups leads and calculates stage revenue", () => {
  const pipeline = buildLeadPipeline(leads);
  const newStage = pipeline.stages.find((stage) => stage.id === "new");
  const contacted = pipeline.stages.find((stage) => stage.id === "contacted");
  assert.equal(newStage.count, 1);
  assert.equal(newStage.monthlyRevenue, 80);
  assert.equal(contacted.count, 1);
  assert.equal(pipeline.metrics.totalMonthlyRevenue, 240);
});

test("calculates summary metrics and overdue follow-ups", () => {
  const pipeline = buildLeadPipeline(leads);
  assert.equal(pipeline.metrics.totalLeads, 3);
  assert.equal(pipeline.metrics.averageMatch, 91);
  assert.equal(pipeline.metrics.needsFollowUp, 1);
});
