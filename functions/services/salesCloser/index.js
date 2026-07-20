import { generateAgentResponse } from "../agentRuntime/openAiClient.js";
import { SALES_CLOSER_SYSTEM_PROMPT } from "./systemPrompt.js";
import { buildSalesCloserContext } from "./contextBuilder.js";
import { composeSalesCloserFallback } from "./fallbackCloser.js";
import { evaluateAdaptiveSalesStrategy } from "./adaptiveSalesStrategy.js";

export async function runSalesCloserTurn({ message, memory = {}, providers = [], quote = null, stage = "DISCOVERY" }) {
  const adaptiveStrategy = evaluateAdaptiveSalesStrategy({ memory, message, quote });
  const context = buildSalesCloserContext({ message, memory, providers, quote, stage });
  const input = `Write the next customer-facing sales-advisor response using this live context.\n${JSON.stringify(context, null, 2)}`;
  try {
    const generated = await generateAgentResponse({ instructions: SALES_CLOSER_SYSTEM_PROMPT, input });
    if (generated.enabled && generated.text) {
      return { message: generated.text, source: "openai_sales_closer", model: generated.model, mode: "adaptive_sales_closer", adaptiveStrategy };
    }
    return { message: composeSalesCloserFallback({ message, memory, providers, quote, adaptiveStrategy }), source: "sales_closer_fallback", warning: generated.reason, mode: "adaptive_sales_closer", adaptiveStrategy };
  } catch (error) {
    return { message: composeSalesCloserFallback({ message, memory, providers, quote, adaptiveStrategy }), source: "sales_closer_fallback", warning: error.message, mode: "adaptive_sales_closer", adaptiveStrategy };
  }
}
