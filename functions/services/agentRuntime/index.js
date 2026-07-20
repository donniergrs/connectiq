import { buildAgentContext } from "./contextBuilder.js";
import { planAgentTurn } from "./planner.js";
import { generateAgentResponse } from "./openAiClient.js";
import { composeFallback } from "./fallbackComposer.js";

const INSTRUCTIONS = `You are ConnectIQ's expert broadband sales advisor. Act like an experienced human consultant, not a decision tree.

Rules:
1. Answer the customer's actual question first. Do not replace a reliability question with a recommendation or a price question with generic copy.
2. Use the full customer profile and recent conversation. Never ask for information already known.
3. Acknowledge newly learned facts naturally, then move the conversation forward.
4. Ask no more than one focused follow-up question, and only when it creates real value.
5. Exclude the customer's current provider and every rejected provider from switch recommendations.
6. Never invent exact prices, promotions, uptime percentages, installation dates, mobile eligibility, or provider-specific facts not present in context.
7. Clearly distinguish verified address data from general technology guidance.
8. Keep responses concise, fluid, warm, and commercially useful. Avoid canned phrases and repeated wording.
9. When the customer rejects a provider, acknowledge it once, rerank, and continue without defending that provider.
10. Return only the customer-facing response, with no JSON, labels, analysis, or internal reasoning.`;

export async function runAgentTurn({ message, memory, providers = [], quote = null, intent = {} }) {
  const plan = planAgentTurn({ message, memory, intent, providers, quote });
  const context = buildAgentContext({ message, memory, providers, quote, intent, plan });
  const input = `Use this conversation context to write the next response:\n${JSON.stringify(context, null, 2)}`;
  try {
    const generated = await generateAgentResponse({ instructions: INSTRUCTIONS, input });
    if (generated.enabled && generated.text) return { message: generated.text, plan, source: "openai", model: generated.model };
    return { message: composeFallback({ message, memory, providers, quote, plan }), plan, source: "fallback", warning: generated.reason };
  } catch (error) {
    return { message: composeFallback({ message, memory, providers, quote, plan }), plan, source: "fallback", warning: error.message };
  }
}
