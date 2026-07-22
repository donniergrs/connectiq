import { generateAgentResponse } from "../agentRuntime/openAiClient.js";
import { SALES_CLOSER_SYSTEM_PROMPT } from "./systemPrompt.js";
import { buildSalesCloserContext } from "./contextBuilder.js";
import { composeSalesCloserFallback } from "./fallbackCloser.js";
import { evaluateAdaptiveSalesStrategy } from "./adaptiveSalesStrategy.js";
import { guardAdvisorMessage } from "./conversationGuard.js";

export async function runSalesCloserTurn({ message, memory = {}, providers = [], quote = null, stage = "DISCOVERY" }) {
  const adaptiveStrategy = evaluateAdaptiveSalesStrategy({ memory, message, quote });
  const context = buildSalesCloserContext({ message, memory, providers, quote, stage });
  const input = `Write the next customer-facing sales-advisor response using this live context.\n${JSON.stringify(context, null, 2)}`;
  let draft;
  let source;
  let model;
  let warning;
  try {
    const generated = await generateAgentResponse({ instructions: SALES_CLOSER_SYSTEM_PROMPT, input });
    if (generated.enabled && generated.text) {
      draft = generated.text;
      source = "openai_sales_closer";
      model = generated.model;
    } else {
      draft = composeSalesCloserFallback({ message, memory, providers, quote, adaptiveStrategy });
      source = "sales_closer_fallback";
      warning = generated.reason;
    }
  } catch (error) {
    draft = composeSalesCloserFallback({ message, memory, providers, quote, adaptiveStrategy });
    source = "sales_closer_fallback";
    warning = error.message;
  }

  const guarded = guardAdvisorMessage({ message: draft, memory, quote, stage });
  return { message: guarded, source, model, warning, mode: "adaptive_sales_closer", adaptiveStrategy, guardApplied: guarded !== draft };
}
