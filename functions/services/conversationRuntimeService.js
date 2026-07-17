import crypto from "node:crypto";

export const SALES_STAGES = Object.freeze([
  "INTRODUCTION", "PERMISSION", "DISCOVERY", "RECOMMENDATION",
  "OBJECTION", "CLOSING", "CALLBACK", "ORDER_READY", "COMPLETED"
]);

const sessions = new Map();
const events = new Map();

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function assertStage(stage) {
  if (!SALES_STAGES.includes(stage)) throw new Error(`Unsupported sales stage: ${stage}`);
}

export function createConversationSession(input = {}) {
  const sessionId = input.sessionId || id("cqs");
  const createdAt = now();
  const session = {
    sessionId,
    conversationId: input.conversationId || id("cqc"),
    customerId: input.customerId || null,
    channel: input.channel || "website",
    stage: input.stage || "INTRODUCTION",
    status: "ACTIVE",
    context: { ...(input.context || {}) },
    createdAt,
    updatedAt: createdAt,
    lastActivityAt: createdAt,
    version: 1,
  };
  assertStage(session.stage);
  sessions.set(sessionId, session);
  events.set(sessionId, []);
  appendConversationEvent(sessionId, { type: "SESSION_STARTED", actor: "system", payload: { channel: session.channel } });
  return clone(session);
}

export function getConversationSession(sessionId) {
  const session = sessions.get(sessionId);
  return session ? clone(session) : null;
}

export function listConversationEvents(sessionId) {
  return clone(events.get(sessionId) || []);
}

export function appendConversationEvent(sessionId, input = {}) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Conversation session not found.");
  const event = {
    eventId: id("cqe"),
    sessionId,
    conversationId: session.conversationId,
    type: input.type || "MESSAGE",
    actor: input.actor || "system",
    text: input.text || "",
    payload: input.payload || {},
    stage: session.stage,
    createdAt: now(),
  };
  const history = events.get(sessionId) || [];
  history.push(event);
  events.set(sessionId, history);
  session.lastActivityAt = event.createdAt;
  session.updatedAt = event.createdAt;
  session.version += 1;
  sessions.set(sessionId, session);
  return clone(event);
}

export function updateConversationSession(sessionId, patch = {}) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Conversation session not found.");
  if (patch.stage) assertStage(patch.stage);
  const updated = {
    ...session,
    ...patch,
    context: { ...session.context, ...(patch.context || {}) },
    updatedAt: now(),
    version: session.version + 1,
  };
  sessions.set(sessionId, updated);
  appendConversationEvent(sessionId, {
    type: patch.stage && patch.stage !== session.stage ? "STAGE_CHANGED" : "SESSION_UPDATED",
    actor: "system",
    payload: { previousStage: session.stage, stage: updated.stage, patch: { ...patch, context: undefined } },
  });
  return getConversationSession(sessionId);
}

export function pauseConversationSession(sessionId) {
  return updateConversationSession(sessionId, { status: "PAUSED" });
}

export function resumeConversationSession(sessionId) {
  return updateConversationSession(sessionId, { status: "ACTIVE", lastActivityAt: now() });
}

export function completeConversationSession(sessionId, context = {}) {
  return updateConversationSession(sessionId, { status: "COMPLETED", stage: "COMPLETED", context });
}

export function runtimeSnapshot(sessionId) {
  const session = getConversationSession(sessionId);
  if (!session) return null;
  return { session, events: listConversationEvents(sessionId) };
}
