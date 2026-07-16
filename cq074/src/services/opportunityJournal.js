function clean(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export const JOURNAL_EVENT_TYPES = Object.freeze({
  STATUS_CHANGE: "status_change",
  ADVISOR_NOTE: "advisor_note",
  FOLLOW_UP: "follow_up",
  ADVISOR_ACTIVITY: "advisor_activity",
  PIPELINE_STAGE_CHANGE: "pipeline_stage_change",
  LEAD_ASSIGNMENT: "lead_assignment",
});

export function advisorIdentity(user) {
  return {
    id: clean(user?.uid, "unknown-advisor"),
    name: clean(user?.displayName || user?.email, "Unknown Advisor"),
    email: clean(user?.email),
  };
}

export function createJournalEvent({ type, title, description, createdBy, metadata = {}, createdAt = new Date() }) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return {
    id: `${type}-${date.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: clean(title, "Advisor activity"),
    description: clean(description, "Lead updated."),
    createdAt: date.toISOString(),
    createdBy: {
      id: clean(createdBy?.id, "unknown-advisor"),
      name: clean(createdBy?.name, "Unknown Advisor"),
      email: clean(createdBy?.email),
    },
    metadata,
  };
}

export function buildWorkspaceJournalEvents({
  previousStatus,
  nextStatus,
  previousFollowUp,
  nextFollowUp,
  note,
  noteCategory = "General",
  notePriority = "Normal",
  activityNote,
  advisor,
  createdAt = new Date(),
}) {
  const events = [];
  const actor = advisorIdentity(advisor);
  const fromStatus = clean(previousStatus, "Unspecified");
  const toStatus = clean(nextStatus, fromStatus);
  const oldFollowUp = clean(previousFollowUp);
  const newFollowUp = clean(nextFollowUp);

  if (fromStatus !== toStatus) {
    events.push(createJournalEvent({
      type: JOURNAL_EVENT_TYPES.STATUS_CHANGE,
      title: "Status changed",
      description: `${fromStatus} → ${toStatus}`,
      createdBy: actor,
      createdAt,
      metadata: { fromStatus, toStatus },
    }));
  }

  if (oldFollowUp !== newFollowUp && newFollowUp) {
    const scheduled = new Date(newFollowUp);
    events.push(createJournalEvent({
      type: JOURNAL_EVENT_TYPES.FOLLOW_UP,
      title: oldFollowUp ? "Follow-up rescheduled" : "Follow-up scheduled",
      description: Number.isNaN(scheduled.getTime()) ? newFollowUp : scheduled.toLocaleString("en-US"),
      createdBy: actor,
      createdAt,
      metadata: { previousFollowUp: oldFollowUp || null, scheduledFor: newFollowUp },
    }));
  }

  const noteText = clean(note);
  if (noteText) {
    events.push(createJournalEvent({
      type: JOURNAL_EVENT_TYPES.ADVISOR_NOTE,
      title: "Advisor note added",
      description: noteText,
      createdBy: actor,
      createdAt,
      metadata: { category: clean(noteCategory, "General"), priority: clean(notePriority, "Normal") },
    }));
  }

  const activityText = clean(activityNote);
  if (activityText) {
    events.push(createJournalEvent({
      type: JOURNAL_EVENT_TYPES.ADVISOR_ACTIVITY,
      title: "Advisor activity",
      description: activityText,
      createdBy: actor,
      createdAt,
      metadata: { status: toStatus },
    }));
  }

  return events;
}

export function eventLabel(type) {
  const labels = {
    status_change: "Status",
    advisor_note: "Note",
    follow_up: "Follow-up",
    advisor_activity: "Activity",
    pipeline_stage_change: "Stage",
    lead_assignment: "Assignment",
    lead_created: "Lead",
    recommendation_generated: "AI",
    quote_generated: "Quote",
  };
  return labels[type] || "Activity";
}
