import { getTool } from "./toolRegistry.js";

export async function executeTools(toolNames, context) {
  const uniqueNames = [...new Set(toolNames)];
  const startedAt = Date.now();

  const executions = await Promise.all(uniqueNames.map(async (name) => {
    const tool = getTool(name);
    if (!tool) {
      return { success: false, tool: name, confidence: 0, durationMs: 0, errors: [`Tool not registered: ${name}`] };
    }
    if (!tool.enabled) {
      return { success: false, tool: name, confidence: 0, durationMs: 0, errors: [`Tool disabled: ${name}`] };
    }
    const toolStartedAt = Date.now();
    try {
      const output = await tool.execute(context);
      return {
        success: output?.success !== false,
        tool: name,
        confidence: output?.confidence ?? 0,
        durationMs: output?.durationMs ?? (Date.now() - toolStartedAt),
        factsUpdated: output?.factsUpdated || [],
        recommendations: output?.recommendations || [],
        messages: output?.messages || [],
        errors: output?.errors || [],
        data: output?.data || {},
      };
    } catch (error) {
      return {
        success: false,
        tool: name,
        confidence: 0,
        durationMs: Date.now() - toolStartedAt,
        factsUpdated: [],
        recommendations: [],
        messages: [],
        errors: [error.message],
        data: {},
      };
    }
  }));

  return {
    success: executions.some((item) => item.success),
    durationMs: Date.now() - startedAt,
    executions,
    errors: executions.flatMap((item) => item.errors || []),
  };
}
