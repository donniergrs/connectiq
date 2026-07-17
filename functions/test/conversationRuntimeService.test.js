import test from "node:test";
import assert from "node:assert/strict";
import {
  createConversationSession, getConversationSession, updateConversationSession,
  appendConversationEvent, listConversationEvents, pauseConversationSession, resumeConversationSession
} from "../services/conversationRuntimeService.js";

test("creates and resumes a conversation session", () => {
  const created = createConversationSession({ customerId: "lead-1", channel: "website" });
  assert.equal(created.stage, "INTRODUCTION");
  pauseConversationSession(created.sessionId);
  assert.equal(getConversationSession(created.sessionId).status, "PAUSED");
  resumeConversationSession(created.sessionId);
  assert.equal(getConversationSession(created.sessionId).status, "ACTIVE");
});

test("persists state and ordered events", () => {
  const created = createConversationSession({ context: { name: "Taylor" } });
  updateConversationSession(created.sessionId, { stage: "DISCOVERY", context: { provider: "Spectrum" } });
  appendConversationEvent(created.sessionId, { actor: "customer", type: "MESSAGE", text: "My bill is high." });
  const current = getConversationSession(created.sessionId);
  const history = listConversationEvents(created.sessionId);
  assert.equal(current.stage, "DISCOVERY");
  assert.equal(current.context.name, "Taylor");
  assert.equal(current.context.provider, "Spectrum");
  assert.ok(history.length >= 3);
});
