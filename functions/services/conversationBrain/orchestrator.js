import { inferTopics, updateThreads, chooseActiveThread } from "./threadManager.js";
import { decideNextBestAction } from "./decisionEngine.js";
import { appendJournalEvent, getConversationJournal } from "./journalService.js";

export function orchestrateTurn({ sessionId, message, intent, learned, memory, providers = [] } = {}) {
  const topics = inferTopics({ message, intent, learned });
  let threads = updateThreads(memory.threads || [], topics);
  const active = chooseActiveThread(threads);
  if (active) threads = updateThreads(threads, [], active.topic);
  const decision = decideNextBestAction({ memory: { ...memory, threads }, intent, threads, providers });

  appendJournalEvent(sessionId, "customer_message_understood", {
    topics,
    factsLearned: Object.keys(learned.facts || {}),
    painPointsLearned: learned.painPoints || [],
    needsLearned: learned.householdNeeds || [],
  });
  appendJournalEvent(sessionId, "next_best_action_selected", decision);

  return {
    primaryGoal: memory.primaryGoal || "find_best_internet_service",
    activeThread: active,
    threads,
    nextBestAction: decision,
    // Backward-compatible alias retained for earlier RC1 clients and tests.
    decision: { ...decision, action: String(decision.action || "").toUpperCase() },
    journal: getConversationJournal(sessionId),
  };
}
