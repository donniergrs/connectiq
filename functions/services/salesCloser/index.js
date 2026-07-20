import { generateAgentResponse } from "../agentRuntime/openAiClient.js";
import { SALES_CLOSER_SYSTEM_PROMPT } from "./systemPrompt.js";
import { buildSalesCloserContext } from "./contextBuilder.js";
import { composeSalesCloserFallback } from "./fallbackCloser.js";

export async function runSalesCloserTurn({ message, memory = {}, providers = [], quote = null, stage = "DISCOVERY" }) {
  const context = buildSalesCloserContext({ message, memory, providers, quote, stage });
  const input = `Write the next customer-facing sales-advisor response using this live context.\n${JSON.stringify(context, null, 2)}`;
  try {
    const generated = await generateAgentResponse({ instructions: SALES_CLOSER_SYSTEM_PROMPT, input });
    if (generated.enabled && generated.text) {
      return { message: generated.text, source: "openai_sales_closer", model: generated.model, mode: "sales_closer" };
    }
    return { message: composeSalesCloserFallback({ message, memory, providers, quote }), source: "sales_closer_fallback", warning: generated.reason, mode: "sales_closer" };
  } catch (error) {
    return { message: composeSalesCloserFallback({ message, memory, providers, quote }), source: "sales_closer_fallback", warning: error.message, mode: "sales_closer" };
  }
}
