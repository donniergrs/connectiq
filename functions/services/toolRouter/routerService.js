import { analyzeIntent } from "./intentAnalyzer.js";
import { learnFromMessage, getCustomerMemory } from "./customerMemoryService.js";
import { listTools, toolRegistryHealth } from "./toolRegistry.js";
import { executeTools } from "./executionPipeline.js";
import { recordDecision, recordTurn, getDiagnostics, telemetryHealth } from "./telemetryService.js";
import { registerDefaultTools } from "./defaultTools.js";

let initialized = false;

export function initializeToolRouter() {
  if (!initialized) {
    registerDefaultTools();
    initialized = true;
  }
  return routerHealth();
}

function selectTools(intent) {
  const selected = [];
  for (const tool of listTools({ enabledOnly: true })) {
    if (tool.intents.some((item) => intent.intents.some((match) => match.intent === item))) selected.push(tool.name);
  }
  if (!selected.includes("leadQualification")) selected.push("leadQualification");
  return selected;
}

function composeResponse(intent, pipeline, memory) {
  const successful = pipeline.executions.filter((item) => item.success);
  const lead = successful.find((item) => item.tool === "leadQualification")?.data;
  const order = successful.find((item) => item.tool === "orderReadiness")?.data;
  return {
    message: successful.flatMap((item) => item.messages || []).filter(Boolean).join(" "),
    nextAction: order?.ready ? "continue_to_order" : intent.primary === "recommendation" ? "present_recommendation" : "continue_discovery",
    leadScore: lead?.score ?? null,
    orderReady: Boolean(order?.ready),
    knownFacts: memory.facts,
  };
}

export async function routeConversationTurn({ sessionId, message, stage = "DISCOVERY", context = {} }) {
  initializeToolRouter();
  if (!sessionId) throw new Error("sessionId is required.");
  if (!String(message || "").trim()) throw new Error("message is required.");

  const startedAt = Date.now();
  const learned = learnFromMessage(sessionId, message);
  const memory = getCustomerMemory(sessionId);
  const intent = analyzeIntent(message, { ...context, stage, memory });
  const toolNames = selectTools(intent);

  recordDecision({
    sessionId,
    stage,
    primaryIntent: intent.primary,
    intents: intent.intents,
    tools: toolNames,
    reason: `Selected tools matching ${intent.intents.map((item) => item.intent).join(", ")}.`,
    confidence: intent.intents[0]?.confidence || 0,
  });

  const pipeline = await executeTools(toolNames, { sessionId, message, stage, context, intent, learned, memory });
  const response = composeResponse(intent, pipeline, memory);
  const turn = {
    ok: pipeline.success,
    sessionId,
    stage,
    intent,
    toolsInvoked: toolNames,
    pipeline,
    memory,
    response,
    durationMs: Date.now() - startedAt,
  };
  recordTurn(turn);
  return turn;
}

export function routerDiagnostics(options = {}) {
  return getDiagnostics(options);
}

export function routerHealth() {
  return {
    ok: true,
    service: "connectiq-intelligent-tool-router",
    registry: toolRegistryHealth(),
    telemetry: telemetryHealth(),
  };
}
