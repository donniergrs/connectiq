import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkspaceJournalEvents, JOURNAL_EVENT_TYPES } from "../src/services/opportunityJournal.js";
import { buildLeadTimeline } from "../src/services/leadWorkspace.js";

const advisor = { uid: "advisor-1", displayName: "Donnie Rogers", email: "donnie@example.com" };
const now = new Date("2026-07-13T20:42:00.000Z");

test("status changes append an attributed immutable journal event", () => {
  const events = buildWorkspaceJournalEvents({ previousStatus: "Qualified", nextStatus: "Contacted", advisor, createdAt: now });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, JOURNAL_EVENT_TYPES.STATUS_CHANGE);
  assert.equal(events[0].metadata.fromStatus, "Qualified");
  assert.equal(events[0].metadata.toStatus, "Contacted");
  assert.equal(events[0].createdBy.name, "Donnie Rogers");
  assert.equal(events[0].createdAt, now.toISOString());
});

test("advisor notes preserve text category priority author and timestamp", () => {
  const [event] = buildWorkspaceJournalEvents({
    previousStatus: "Contacted",
    nextStatus: "Contacted",
    note: "Customer prefers a callback after 5 PM.",
    noteCategory: "Scheduling",
    notePriority: "High",
    advisor,
    createdAt: now,
  });
  assert.equal(event.type, JOURNAL_EVENT_TYPES.ADVISOR_NOTE);
  assert.equal(event.description, "Customer prefers a callback after 5 PM.");
  assert.deepEqual(event.metadata, { category: "Scheduling", priority: "High" });
  assert.equal(event.createdBy.email, "donnie@example.com");
});

test("follow-up changes produce a scheduled event with old and new values", () => {
  const [event] = buildWorkspaceJournalEvents({
    previousStatus: "Contacted",
    nextStatus: "Contacted",
    previousFollowUp: "2026-07-14T10:00",
    nextFollowUp: "2026-07-15T17:00",
    advisor,
    createdAt: now,
  });
  assert.equal(event.type, JOURNAL_EVENT_TYPES.FOLLOW_UP);
  assert.equal(event.metadata.previousFollowUp, "2026-07-14T10:00");
  assert.equal(event.metadata.scheduledFor, "2026-07-15T17:00");
});

test("one save can append status note follow-up and activity events", () => {
  const events = buildWorkspaceJournalEvents({
    previousStatus: "Qualified",
    nextStatus: "Contacted",
    previousFollowUp: "",
    nextFollowUp: "2026-07-15T17:00",
    note: "Customer requested evening callback.",
    activityNote: "Left voicemail.",
    advisor,
    createdAt: now,
  });
  assert.deepEqual(events.map((event) => event.type), [
    JOURNAL_EVENT_TYPES.STATUS_CHANGE,
    JOURNAL_EVENT_TYPES.FOLLOW_UP,
    JOURNAL_EVENT_TYPES.ADVISOR_NOTE,
    JOURNAL_EVENT_TYPES.ADVISOR_ACTIVITY,
  ]);
});

test("journal entries are normalized into newest-first opportunity history", () => {
  const lead = {
    createdAt: "2026-07-13T14:00:00.000Z",
    opportunityJournal: [
      {
        id: "note-1",
        type: "advisor_note",
        title: "Advisor note added",
        description: "First note",
        createdAt: "2026-07-13T16:00:00.000Z",
        createdBy: { name: "Donnie Rogers" },
        metadata: { category: "General", priority: "Normal" },
      },
      {
        id: "status-1",
        type: "status_change",
        title: "Status changed",
        description: "Qualified → Contacted",
        createdAt: "2026-07-13T17:00:00.000Z",
        createdBy: { name: "Donnie Rogers" },
        metadata: { fromStatus: "Qualified", toStatus: "Contacted" },
      },
    ],
  };
  const timeline = buildLeadTimeline(lead);
  assert.equal(timeline[0].id, "status-1");
  assert.equal(timeline[1].id, "note-1");
  assert.equal(timeline[0].createdBy.name, "Donnie Rogers");
});
