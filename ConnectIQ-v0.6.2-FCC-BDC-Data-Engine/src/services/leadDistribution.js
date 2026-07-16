import { arrayUnion, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { advisorIdentity, createJournalEvent } from "./opportunityJournal.js";
import { advisorAssignment, normalizeAdvisor } from "./salesTeam.js";

function activeLoad(advisor, leads = []) {
  const uid = normalizeAdvisor(advisor).uid;
  return leads.filter((lead) => (lead.assignedAdvisor?.uid || lead.assignedAdvisorUid) === uid && !["Installed", "Closed", "Closed Lost", "Cancelled"].includes(lead.status)).length;
}

export function advisorWorkloads(advisors = [], leads = []) {
  return advisors.map((advisor) => {
    const normalized = normalizeAdvisor(advisor);
    const assigned = activeLoad(normalized, leads);
    const capacity = normalized.capacity || 0;
    return { ...normalized, assigned, available: capacity ? Math.max(0, capacity - assigned) : Infinity, utilization: capacity ? Math.round((assigned / capacity) * 100) : 0 };
  });
}

export function roundRobinAssignments(leads = [], advisors = [], startIndex = 0) {
  const active = advisors.map(normalizeAdvisor).filter((advisor) => advisor.active);
  if (!active.length) return [];
  return leads.map((lead, index) => ({ lead, advisor: active[(startIndex + index) % active.length], method: "round_robin" }));
}

export function capacityAwareAssignments(leads = [], advisors = [], allLeads = []) {
  const workloads = advisorWorkloads(advisors, allLeads).filter((advisor) => advisor.active && advisor.available > 0);
  const mutable = workloads.map((advisor) => ({ ...advisor }));
  return leads.map((lead) => {
    mutable.sort((a, b) => a.utilization - b.utilization || a.assigned - b.assigned || a.name.localeCompare(b.name));
    const advisor = mutable[0];
    if (!advisor) return { lead, advisor: null, method: "capacity_aware" };
    advisor.assigned += 1;
    advisor.available = advisor.capacity ? Math.max(0, advisor.capacity - advisor.assigned) : Infinity;
    advisor.utilization = advisor.capacity ? Math.round((advisor.assigned / advisor.capacity) * 100) : 0;
    return { lead, advisor, method: "capacity_aware" };
  });
}

export function assignmentUpdate({ lead, advisor, actor, method = "manual" }) {
  const assignment = advisorAssignment(advisor, actor);
  const previousOwner = lead.assignedAdvisor?.name || lead.assignedAdvisorName || "Unassigned";
  const nextOwner = assignment?.name || "Unassigned";
  const event = createJournalEvent({
    type: "lead_assignment",
    title: method === "manual" ? "Lead assigned" : "Lead distributed",
    description: `${previousOwner} → ${nextOwner}`,
    createdBy: advisorIdentity(actor),
    metadata: { previousOwner, nextOwner, assignedAdvisorUid: assignment?.uid || null, method },
  });
  return {
    assignedAdvisor: assignment,
    assignedAdvisorName: nextOwner,
    assignedAdvisorUid: assignment?.uid || null,
    assignmentMethod: method,
    updatedAt: serverTimestamp(),
    lastModifiedBy: advisorIdentity(actor),
    opportunityJournal: arrayUnion(event),
  };
}

export async function bulkAssignLeads({ db, leads, advisor, actor, method = "bulk_manual" }) {
  const batch = writeBatch(db);
  leads.forEach((lead) => batch.update(doc(db, "leads", lead.id), assignmentUpdate({ lead, advisor, actor, method })));
  await batch.commit();
  return leads.length;
}

export async function distributeLeads({ db, leads, advisors, allLeads = [], actor, mode = "round_robin" }) {
  const assignments = mode === "capacity_aware"
    ? capacityAwareAssignments(leads, advisors, allLeads)
    : roundRobinAssignments(leads, advisors);
  const batch = writeBatch(db);
  assignments.filter((item) => item.advisor).forEach(({ lead, advisor, method }) => {
    batch.update(doc(db, "leads", lead.id), assignmentUpdate({ lead, advisor, actor, method }));
  });
  await batch.commit();
  return assignments;
}


export function bulkStagePlan(leads = [], toStatus = "") {
  return leads.filter((lead) => lead?.id && toStatus).map((lead) => ({
    lead,
    fromStatus: lead.status || lead.stageLabel || "New",
    toStatus,
  }));
}

export async function bulkMoveLeadStages({ db, leads, toStatus, actor }) {
  if (!toStatus || !leads.length) return 0;
  const batch = writeBatch(db);
  bulkStagePlan(leads, toStatus).forEach(({ lead, fromStatus }) => {
    const event = createJournalEvent({
      type: "pipeline_stage_change",
      title: "Pipeline stage changed",
      description: `${fromStatus} → ${toStatus}`,
      createdBy: advisorIdentity(actor),
      metadata: { fromStatus, toStatus, method: "bulk" },
    });
    batch.update(doc(db, "leads", lead.id), {
      status: toStatus,
      updatedAt: serverTimestamp(),
      lastModifiedBy: advisorIdentity(actor),
      opportunityJournal: arrayUnion(event),
    });
  });
  await batch.commit();
  return leads.length;
}

export async function createLeadTask({ db, leadId, title, dueAt, priority = "Normal", advisor, actor }) {
  const task = { id: crypto.randomUUID(), title: String(title || "").trim(), dueAt: dueAt || null, priority, status: "Open", assignedAdvisorUid: advisor?.uid || advisor?.id || null, assignedAdvisorName: advisor?.name || null, createdAt: new Date().toISOString(), createdBy: advisorIdentity(actor) };
  const event = createJournalEvent({ type: "task_created", title: "Task created", description: task.title, createdBy: advisorIdentity(actor), metadata: { taskId: task.id, dueAt, priority } });
  await updateDoc(doc(db, "leads", leadId), { tasks: arrayUnion(task), opportunityJournal: arrayUnion(event), updatedAt: serverTimestamp() });
  return task;
}
