import { detectTopics, updateThreads } from "./threadManager.js";
import { decideNextAction } from "./decisionEngine.js";
import { appendJournal } from "./journal.js";

export function orchestrateTurn({ message, memory = {}, providers = [], stage = "DISCOVERY", semantic = null } = {}) {
  const topics = [...new Set([...(semantic?.intents || []).map((item) => item.intent).filter(Boolean), ...detectTopics(message)])];
  const now = new Date().toISOString();
  const threads = updateThreads(memory.threads || [], topics.length ? topics : ["discovery"], now);
  const activeThread = threads.find((item) => item.status === "OPEN") || null;
  const decision = decideNextAction({ memory, topics, providers, stage });
  const journal = appendJournal(memory.journal || [], { type: "CUSTOMER_TURN", summary: `Processed customer message; next action ${decision.action}.`, data: { topics, decision } });
  return { topics, threads, activeThread, decision, journal, conversationState: { stage, activeThreadId: activeThread?.id || null, openThreadCount: threads.filter((item) => item.status === "OPEN").length, lastTurnAt: now } };
}
