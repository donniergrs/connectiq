import { classifyIntents } from "./intentClassifier.js";
import { extractConversationFacts } from "./factExtractor.js";
import { executeSkill } from "./skills.js";

export function orchestrateBrainV2({ message, memory, providers = [], quote = null }) {
  const intent = classifyIntents(message);
  const extracted = extractConversationFacts(message, memory);
  const skillResult = executeSkill({ intent: intent.primary, message, memory, providers, quote });
  return {
    version: "2.0.0-m1",
    intent,
    extracted,
    selectedSkill: skillResult.skill,
    response: skillResult,
    activeThread: intent.primary,
    nextBestAction: skillResult.skill,
    health: { answeredIntent: true, score: 100 },
  };
}
