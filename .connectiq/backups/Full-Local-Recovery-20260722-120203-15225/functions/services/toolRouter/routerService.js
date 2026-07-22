import { analyzeIntent } from "./intentAnalyzer.js";
import { learnFromMessage, getCustomerMemory, hydrateCustomerMemory } from "./customerMemoryService.js";
import { listTools, toolRegistryHealth } from "./toolRegistry.js";
import { executeTools } from "./executionPipeline.js";
import { recordDecision, recordTurn, getDiagnostics, telemetryHealth } from "./telemetryService.js";
import { registerDefaultTools } from "./defaultTools.js";
import { orchestrateTurn } from "../conversationBrain/orchestrator.js";
import { updateCustomerMemory } from "./customerMemoryService.js";
import { orchestrateBrainV2 } from "../brainV2/orchestrator.js";
import { extractConversationFacts } from "../brainV2/factExtractor.js";
import { runSalesCloserTurn } from "../salesCloser/index.js";
import { evaluateSalesIntelligence } from "../salesIntelligence/index.js";
import { orchestrateSalesResponse } from "../salesOrchestrator/index.js";

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

export async function routeConversationTurn({ sessionId, message, stage = "DISCOVERY", context = {}, address = "" }) {
  initializeToolRouter();
  if (!sessionId) throw new Error("sessionId is required.");
  if (!String(message || "").trim()) throw new Error("message is required.");

  const startedAt = Date.now();
  // Cloud Functions are stateless. Rehydrate the proven local Brain memory
  // from the browser on every turn before the original local logic runs.
  if (context?.clientMemory && typeof context.clientMemory === "object") {
    hydrateCustomerMemory(sessionId, context.clientMemory);
  }
  const learned = learnFromMessage(sessionId, message);
  const initialMemory = getCustomerMemory(sessionId);
  const extracted = extractConversationFacts(message, initialMemory);
  const memory = updateCustomerMemory(sessionId, {
    facts: { ...extracted.facts, ...(address ? { serviceAddress: address } : {}) },
    householdNeeds: extracted.needs,
    painPoints: extracted.painPoints,
    preferences: extracted.preferences,
    corrections: extracted.isCorrection ? [{
      previousProvider: extracted.previousProvider,
      currentProvider: extracted.facts.currentProvider,
      detectedAt: new Date().toISOString(),
    }] : [],
  });
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

  const providers = Array.isArray(context.providers) ? context.providers : [];
  const orchestration = orchestrateTurn({ sessionId, message, intent, learned, memory, providers });
  const enrichedMemory = updateCustomerMemory(sessionId, {
    threads: orchestration.threads,
    decisions: [orchestration.nextBestAction],
    primaryGoal: orchestration.primaryGoal,
    journal: orchestration.journal,
  });
  const pipeline = await executeTools(toolNames, { sessionId, message, stage, context, intent, learned, memory: enrichedMemory, orchestration });
  const response = composeResponse(intent, pipeline, enrichedMemory);
  const brainV2 = orchestrateBrainV2({
    message,
    memory: enrichedMemory,
    providers,
    quote: context.quote || null,
  });
  const controlledSales = orchestrateSalesResponse({
    message,
    memory: enrichedMemory,
    providers,
    quote: context.quote || null,
  });
  const agentDraft = await runSalesCloserTurn({
    message,
    memory: enrichedMemory,
    providers,
    quote: context.quote || null,
    stage: controlledSales.stage || stage,
  });
  const agent = {
    ...agentDraft,
    message: controlledSales.message,
    source: "controlled_sales_orchestrator",
    controlledSales,
  };
  const finalMemory = updateCustomerMemory(sessionId, {
    relationship: {
      ...(enrichedMemory.relationship || {}),
      persona: agent.adaptiveStrategy?.persona || null,
      emotion: agent.adaptiveStrategy?.emotion || null,
      primaryMotivation: agent.adaptiveStrategy?.primaryMotivation || null,
      readiness: agent.adaptiveStrategy?.readiness || null,
      strategyObjective: agent.adaptiveStrategy?.objective || null,
    },
    lastNextAction: controlledSales.nextAction,
    selectedProvider: controlledSales.selectedProvider || enrichedMemory.selectedProvider || null,
    recentTurns: [
      { role: "customer", message: String(message), at: new Date().toISOString() },
      { role: "advisor", message: agent.message, at: new Date().toISOString() },
    ],
  });
  const salesIntelligence = evaluateSalesIntelligence({
    message,
    memory: finalMemory,
    quote: context.quote || null,
  });
  const turn = {
    ok: pipeline.success,
    sessionId,
    stage,
    message: String(message),
    learned,
    intent,
    toolsInvoked: toolNames,
    pipeline,
    memory: finalMemory,
    orchestration,
    brainV2,
    agent,
    salesIntelligence,
    response: {
      ...response,
      message: agent.message,
      nextAction: controlledSales.nextAction,
      stage: controlledSales.stage,
      suggestedReplies: controlledSales.suggestedReplies || [],
      followUp: null,
    },
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
