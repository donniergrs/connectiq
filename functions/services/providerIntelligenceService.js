const CACHE_TTL_MS = Number(process.env.PROVIDER_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const lookupCache = new Map();

const text = (value) => String(value ?? "").trim();
const enabled = (name, fallback = false) => String(process.env[name] ?? fallback).toLowerCase() === "true";
const slugify = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function normalizeTechnology(value) {
  const raw = text(value);
  const lower = raw.toLowerCase();
  if (["fiber", "fttp", "fiber to the premises"].some((item) => lower.includes(item))) return "Fiber";
  if (["cable", "docsis"].some((item) => lower.includes(item))) return "Cable";
  if (["fixed wireless", "5g home"].some((item) => lower.includes(item))) return "Fixed Wireless";
  if (["dsl", "copper"].some((item) => lower.includes(item))) return "DSL";
  if (["satellite"].some((item) => lower.includes(item))) return "Satellite";
  return raw || "Broadband";
}

function dedupeProviders(providers) {
  const seen = new Set();
  return providers.filter(Boolean).filter((provider) => {
    const key = `${provider.providerId || provider.displayName.toLowerCase()}|${provider.technology.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function parseJsonCandidate(value) {
  const raw = text(value).replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(raw); } catch { /* continue with object extraction */ }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function extractOpenAiText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string") parts.push(content.text);
      else if (typeof content?.output_text === "string") parts.push(content.output_text);
    }
  }
  return parts.join("\n");
}

async function requestOpenAiProviders({ apiKey, address, model, useWebSearch, timeoutMs }) {
  const systemText = useWebSearch
    ? "You are ConnectIQ Provider Intelligence. Use web search to identify residential internet providers that likely serve the exact U.S. address or its immediate neighborhood. Return only provider candidates, never an empty list for a valid address. Do not claim exact serviceability is verified. Prefer fiber, cable, DSL, and fixed wireless; place satellite last."
    : "You are ConnectIQ Provider Intelligence. Identify residential internet providers that likely serve the exact U.S. address using the city, ZIP code, and known carrier footprints. Return 4 to 10 provider candidates for every valid U.S. address. Do not claim exact serviceability is verified.";

  const body = {
    model,
    max_output_tokens: 700,
    input: [
      { role: "system", content: [{ type: "input_text", text: systemText }] },
      { role: "user", content: [{ type: "input_text", text: `Service address: ${address}` }] },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "provider_candidates",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            candidates: {
              type: "array",
              minItems: 1,
              maxItems: 10,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  confidence: { type: "number" },
                  technology: { type: "string" },
                },
                required: ["name", "confidence", "technology"],
              },
            },
          },
          required: ["candidates"],
        },
      },
    },
  };
  if (useWebSearch) body.tools = [{ type: "web_search" }];

  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, timeoutMs);

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload?.error?.message || `OpenAI provider intelligence failed (${response.status}).`);
  }
  return response.json();
}

function candidateRowsFromOpenAi(payload) {
  const output = extractOpenAiText(payload);
  const parsed = parseJsonCandidate(output) || {};
  if (Array.isArray(parsed.candidates)) return parsed.candidates;
  if (Array.isArray(parsed.providers)) return parsed.providers;

  return output.split(/\r?\n/).map((line) => line
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .replace(/\s*[—–-]\s*(fiber|cable|dsl|fixed wireless|satellite|broadband).*$/i, "")
    .trim())
    .filter((line) => line && line.length < 90 && !/[{}[\]]/.test(line))
    .slice(0, 10)
    .map((name) => ({ name, confidence: 55, technology: "Broadband" }));
}

function normalizeOpenAiCandidates(payload, sourceLabel) {
  return dedupeProviders(candidateRowsFromOpenAi(payload).map((candidate, index) => ({
    id: `ai-${slugify(candidate.name || candidate.provider || `candidate-${index + 1}`)}`,
    name: text(candidate.name || candidate.provider),
    displayName: text(candidate.name || candidate.provider),
    confidence: Math.max(0, Math.min(100, Number(candidate.confidence || 0))),
    evidence: "ConnectIQ AI identified this provider as a likely option for the address or immediate locality. Final serviceability will be confirmed before ordering.",
    officialVerificationUrl: "",
    source: sourceLabel,
    verified: true,
    verificationRequired: false,
    technology: normalizeTechnology(candidate.technology),
    download: 0,
    upload: 0,
  })).filter((candidate) => candidate.name));
}

async function lookupAiResearch(address, trace) {
  const apiKey = text(process.env.OPENAI_API_KEY);
  if (!apiKey || !enabled("ENABLE_AI_PROVIDER_RESEARCH")) {
    trace.push({ source: "openai", status: "disabled", detail: "OpenAI provider intelligence is not enabled" });
    return { status: "disabled", providers: [] };
  }

  const fastTimeoutMs = Math.max(Number(process.env.OPENAI_PROVIDER_FAST_TIMEOUT_MS || 45000), 10000);
  const webTimeoutMs = Math.max(Number(process.env.OPENAI_PROVIDER_WEB_TIMEOUT_MS || 45000), 10000);
  const fastModel = process.env.OPENAI_PROVIDER_FAST_MODEL || process.env.OPENAI_PROVIDER_RESEARCH_MODEL || "gpt-4.1-mini";
  const webModel = process.env.OPENAI_PROVIDER_WEB_MODEL || "gpt-4.1-mini";

  const wrapped = [
    requestOpenAiProviders({ apiKey, address, model: fastModel, useWebSearch: false, timeoutMs: fastTimeoutMs })
      .then((payload) => ({ source: "openai", providers: normalizeOpenAiCandidates(payload, "openai") }))
      .catch((error) => ({ source: "openai", providers: [], error })),
    requestOpenAiProviders({ apiKey, address, model: webModel, useWebSearch: true, timeoutMs: webTimeoutMs })
      .then((payload) => ({ source: "openai-web-search", providers: normalizeOpenAiCandidates(payload, "openai-web-search") }))
      .catch((error) => ({ source: "openai-web-search", providers: [], error })),
  ].map((promise, id) => promise.then((value) => ({ id, value })));

  const pending = new Map(wrapped.map((promise, id) => [id, promise]));
  let lastError = null;

  while (pending.size) {
    const { id, value } = await Promise.race([...pending.values()]);
    pending.delete(id);

    if (value.providers?.length) {
      trace.push({ source: value.source, status: "suggested", detail: `${value.providers.length} possible providers returned` });
      return { status: "suggested", providers: value.providers };
    }

    if (value.error) lastError = value.error;
    trace.push({
      source: value.source,
      status: value.error?.name === "AbortError" ? "timeout" : (value.error ? "failed" : "empty"),
      detail: value.error?.message || "No provider candidates returned",
    });
  }

  const status = lastError?.name === "AbortError" ? "timeout" : (lastError ? "failed" : "empty");
  return { status, providers: [], error: lastError?.message || "OpenAI returned no provider candidates." };
}

export async function executeProviderWaterfall(address, adapters = {}) {
  const trace = [{ source: "connectiq-intelligence", status: "started", detail: address }];
  const ai = await (adapters.ai || lookupAiResearch)(address, trace);
  if (ai.providers?.length) {
    return { winner: "openai", providers: ai.providers, trace, sources: { ai: ai.status } };
  }
  return { winner: "none", providers: [], trace, sources: { ai: ai.status } };
}

export async function lookupProviderIntelligence(address, options = {}) {
  const normalizedAddress = text(address).replace(/\s+/g, " ");
  const cacheKey = normalizedAddress.toLowerCase();
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS && options.refresh !== true) return { ...cached.value, cache: { hit: true, ageMs: Date.now() - cached.cachedAt } };
  const startedAt = Date.now();
  const waterfall = await executeProviderWaterfall(normalizedAddress);
  const providers = waterfall.providers || [];
  const result = {
    ok: true,
    address: normalizedAddress,
    matchedAddress: normalizedAddress,
    source: "openai",
    providerCount: providers.length,
    providers,
    candidateCount: providers.length,
    status: providers.length ? "providers_found" : "no_providers_found",
    verificationRequired: false,
    recommendationEligible: providers.length > 0,
    waterfall: waterfall.sources,
    trace: waterfall.trace,
    durationMs: Date.now() - startedAt,
    cachedAt: new Date().toISOString(),
  };
  lookupCache.set(cacheKey, { cachedAt: Date.now(), value: result });
  return { ...result, cache: { hit: false, ageMs: 0 } };
}

export function providerIntelligenceStatus() {
  return {
    cacheEntries: lookupCache.size,
    cacheTtlMs: CACHE_TTL_MS,
    activeWorkflow: "openai-only",
    aiResearchEnabled: Boolean(text(process.env.OPENAI_API_KEY)) && enabled("ENABLE_AI_PROVIDER_RESEARCH"),
    fccEnabled: false,
    providerSource: "openai-only",
  };
}
