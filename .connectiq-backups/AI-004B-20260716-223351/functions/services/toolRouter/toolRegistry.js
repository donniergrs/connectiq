const registry = new Map();

function normalizeTool(tool) {
  if (!tool || typeof tool !== "object") throw new TypeError("Tool definition is required.");
  if (!tool.name || typeof tool.name !== "string") throw new TypeError("Tool name is required.");
  if (typeof tool.execute !== "function") throw new TypeError(`Tool ${tool.name} must define execute().`);
  return Object.freeze({
    name: tool.name,
    version: tool.version || "1.0.0",
    description: tool.description || "",
    enabled: tool.enabled !== false,
    intents: Array.isArray(tool.intents) ? [...tool.intents] : [],
    priority: Number.isFinite(tool.priority) ? tool.priority : 100,
    execute: tool.execute,
  });
}

export function registerTool(tool) {
  const normalized = normalizeTool(tool);
  registry.set(normalized.name, normalized);
  return normalized;
}

export function unregisterTool(name) {
  return registry.delete(name);
}

export function getTool(name) {
  return registry.get(name) || null;
}

export function listTools({ enabledOnly = false } = {}) {
  return [...registry.values()]
    .filter((tool) => !enabledOnly || tool.enabled)
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    .map(({ execute, ...metadata }) => metadata);
}

export function clearTools() {
  registry.clear();
}

export function toolRegistryHealth() {
  const tools = [...registry.values()];
  return {
    ok: true,
    registered: tools.length,
    enabled: tools.filter((tool) => tool.enabled).length,
    tools: listTools(),
  };
}
