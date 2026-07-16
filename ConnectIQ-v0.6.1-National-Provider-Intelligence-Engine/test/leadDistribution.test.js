import test from "node:test";
import assert from "node:assert/strict";
import { advisorWorkloads, bulkStagePlan, capacityAwareAssignments, roundRobinAssignments, assignmentUpdate } from "../src/services/leadDistribution.js";
import { buildPriorityQueue, leadPriority } from "../src/services/priorityEngine.js";

const advisors = [
  { id: "a", name: "A", active: true, capacity: 2 },
  { id: "b", name: "B", active: true, capacity: 4 },
];
const leads = [
  { id: "1", assignedAdvisorUid: "a", status: "New" },
  { id: "2", assignedAdvisorUid: "a", status: "Qualified" },
  { id: "3", assignedAdvisorUid: "b", status: "New" },
];

test("round robin distributes leads evenly", () => {
  const result = roundRobinAssignments([{ id: 4 }, { id: 5 }, { id: 6 }], advisors);
  assert.deepEqual(result.map((item) => item.advisor.id), ["a", "b", "a"]);
});

test("capacity aware assignment favors available capacity", () => {
  const result = capacityAwareAssignments([{ id: 4 }, { id: 5 }], advisors, leads);
  assert.equal(result[0].advisor.id, "b");
});

test("advisor workloads report utilization", () => {
  const result = advisorWorkloads(advisors, leads);
  assert.equal(result.find((item) => item.id === "a").utilization, 100);
  assert.equal(result.find((item) => item.id === "b").utilization, 25);
});

test("assignment payload records method and journal event", () => {
  const update = assignmentUpdate({ lead: { assignedAdvisorName: "Unassigned" }, advisor: advisors[0], actor: { uid: "m", email: "manager@test.com" }, method: "round_robin" });
  assert.equal(update.assignmentMethod, "round_robin");
  assert.equal(update.assignedAdvisorName, "A");
});

test("priority scoring rewards overdue ready leads", () => {
  const high = leadPriority({ status: "Qualified", followUpDate: new Date(Date.now() - 86400000), salesSummary: { readiness: { score: 95 }, recommendation: { matchScore: 95 } }, quote: { monthly: 120 } });
  const low = leadPriority({ status: "New", salesSummary: { readiness: { score: 20 }, recommendation: { matchScore: 40 } } });
  assert.ok(high.priorityScore > low.priorityScore);
});

test("priority queue returns highest score first", () => {
  const queue = buildPriorityQueue([
    { id: "low", status: "New", salesSummary: { readiness: { score: 10 } } },
    { id: "high", status: "Qualified", followUpDate: new Date(Date.now() - 86400000), salesSummary: { readiness: { score: 95 }, recommendation: { matchScore: 90 } } },
  ]);
  assert.equal(queue[0].id, "high");
});


test("bulk stage planning preserves each prior stage", () => {
  const plan = bulkStagePlan([{ id: "1", status: "New" }, { id: "2", status: "Qualified" }], "Quoted");
  assert.deepEqual(plan.map((item) => [item.fromStatus, item.toStatus]), [["New", "Quoted"], ["Qualified", "Quoted"]]);
});
