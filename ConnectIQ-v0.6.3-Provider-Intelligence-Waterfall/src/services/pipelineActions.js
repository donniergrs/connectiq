import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { advisorIdentity, createJournalEvent } from "./opportunityJournal.js";
import { advisorAssignment } from "./salesTeam.js";

export async function moveLeadStage({ db, leadId, fromStatus, toStatus, advisor }) {
  const event = createJournalEvent({
    type: "pipeline_stage_change",
    title: "Pipeline stage changed",
    description: `${fromStatus || "Unspecified"} → ${toStatus}`,
    createdBy: advisorIdentity(advisor),
    metadata: { fromStatus: fromStatus || null, toStatus },
  });
  await updateDoc(doc(db, "leads", leadId), {
    status: toStatus,
    updatedAt: serverTimestamp(),
    lastModifiedBy: advisorIdentity(advisor),
    opportunityJournal: arrayUnion(event),
  });
  return event;
}

export async function assignLeadOwner({ db, leadId, previousOwner, advisorRecord, assignedBy }) {
  const assignment = advisorAssignment(advisorRecord, assignedBy);
  const nextOwner = assignment?.name || "Unassigned";
  const event = createJournalEvent({
    type: "lead_assignment",
    title: assignment ? "Lead assigned" : "Lead unassigned",
    description: `${previousOwner || "Unassigned"} → ${nextOwner}`,
    createdBy: advisorIdentity(assignedBy),
    metadata: {
      previousOwner: previousOwner || "Unassigned",
      nextOwner,
      assignedAdvisorUid: assignment?.uid || null,
    },
  });
  await updateDoc(doc(db, "leads", leadId), {
    assignedAdvisor: assignment,
    assignedAdvisorName: assignment?.name || "Unassigned",
    assignedAdvisorUid: assignment?.uid || null,
    updatedAt: serverTimestamp(),
    lastModifiedBy: advisorIdentity(assignedBy),
    opportunityJournal: arrayUnion(event),
  });
  return event;
}
