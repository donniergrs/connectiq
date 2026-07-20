import { registerTool } from "./toolRegistry.js";

function result(tool, startedAt, payload = {}) {
  return {
    success: true,
    tool,
    confidence: payload.confidence ?? 0.8,
    durationMs: Date.now() - startedAt,
    factsUpdated: payload.factsUpdated || [],
    recommendations: payload.recommendations || [],
    messages: payload.messages || [],
    errors: [],
    data: payload.data || {},
  };
}

export function registerDefaultTools() {
  registerTool({
    name: "discovery",
    description: "Captures customer needs, provider, price, pain points, and buying context.",
    intents: ["discovery"],
    priority: 10,
    async execute(ctx) {
      const startedAt = Date.now();
      const memory = ctx.memory;
      const missing = ["currentProvider", "monthlyBill"].filter((key) => memory.facts?.[key] == null);
      return result("discovery", startedAt, {
        confidence: 0.9,
        factsUpdated: Object.keys(ctx.learned?.facts || {}),
        messages: missing.length ? [`Discovery still needs: ${missing.join(", ")}.`] : ["Core discovery information is available."],
        data: { missing },
      });
    },
  });

  registerTool({
    name: "recommendation",
    description: "Builds recommendation guidance from known customer needs and available provider context.",
    intents: ["recommendation"],
    priority: 20,
    async execute(ctx) {
      const startedAt = Date.now();
      const needs = ctx.memory.householdNeeds || [];
      const pains = ctx.memory.painPoints || [];
      const rationale = [
        pains.includes("reliability") ? "reliability concern" : null,
        needs.includes("workFromHome") ? "remote-work requirement" : null,
        needs.includes("gaming") ? "gaming requirement" : null,
        ctx.memory.facts?.monthlyBill ? `current bill of $${ctx.memory.facts.monthlyBill}` : null,
      ].filter(Boolean);
      return result("recommendation", startedAt, {
        confidence: rationale.length ? 0.86 : 0.63,
        recommendations: [{ type: "next_best_action", action: "evaluate_available_providers", rationale }],
        messages: ["Recommendation context prepared."],
        data: { rationale },
      });
    },
  });

  registerTool({
    name: "objection",
    description: "Identifies and structures customer objections for a grounded response.",
    intents: ["objection"],
    priority: 30,
    async execute(ctx) {
      const startedAt = Date.now();
      const lower = ctx.message.toLowerCase();
      const objection = lower.includes("expensive") || lower.includes("price") ? "price"
        : lower.includes("contract") ? "contract"
        : lower.includes("trust") ? "trust"
        : "general_hesitation";
      return result("objection", startedAt, {
        confidence: 0.84,
        messages: [`Objection identified: ${objection}.`],
        data: { objection },
      });
    },
  });

  registerTool({
    name: "leadQualification",
    description: "Scores sales qualification based on known customer facts and expressed need.",
    intents: ["discovery", "recommendation", "orderReadiness"],
    priority: 40,
    async execute(ctx) {
      const startedAt = Date.now();
      let score = 20;
      if (ctx.memory.facts?.currentProvider) score += 15;
      if (ctx.memory.facts?.monthlyBill) score += 15;
      score += Math.min(20, (ctx.memory.painPoints?.length || 0) * 10);
      score += Math.min(15, (ctx.memory.householdNeeds?.length || 0) * 5);
      if (ctx.intent.primary === "orderReadiness") score += 15;
      return result("leadQualification", startedAt, {
        confidence: 0.82,
        data: { score: Math.min(100, score), qualified: score >= 55 },
        messages: [`Lead qualification score: ${Math.min(100, score)}.`],
      });
    },
  });

  registerTool({
    name: "orderReadiness",
    description: "Determines whether the customer has enough information and intent to proceed.",
    intents: ["orderReadiness"],
    priority: 50,
    async execute(ctx) {
      const startedAt = Date.now();
      const required = ["currentProvider"];
      const missing = required.filter((key) => !ctx.memory.facts?.[key]);
      return result("orderReadiness", startedAt, {
        confidence: missing.length ? 0.66 : 0.9,
        data: { ready: missing.length === 0, missing },
        messages: [missing.length ? `Order readiness needs: ${missing.join(", ")}.` : "Customer is ready for the next order step."],
      });
    },
  });

  registerTool({
    name: "knowledge",
    description: "Provides a structured handoff for broadband education and FAQ answers.",
    intents: ["knowledge"],
    priority: 60,
    async execute(ctx) {
      const startedAt = Date.now();
      return result("knowledge", startedAt, {
        confidence: 0.72,
        messages: ["Knowledge request detected and prepared for the response layer."],
        data: { question: ctx.message },
      });
    },
  });
}
