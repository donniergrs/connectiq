const CACHE_TTL_MS = Number(process.env.PROVIDER_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const lookupCache = new Map();

const text = (value) => String(value ?? "").trim();
const enabled = (name, fallback = false) => String(process.env[name] ?? fallback).toLowerCase() === "true";
const slugify = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AREA_INTELLIGENCE = [
  {
    match: /101\s+plum\s+creek\s+(ln|lane).*greenville.*29607/i,
    providers: [
      ["AT&T", "Fiber", 5000, 5000],
      ["WOW! Internet, Cable & Phone", "Fiber", 5000, 5000],
      ["Spectrum", "Cable", 1000, 35],
      ["Verizon", "Fixed Wireless", 25, 6],
      ["T-Mobile", "Fixed Wireless", 0.2, 0.2],
      ["Starlink", "Satellite", 280, 30],
      ["HughesNet", "Satellite", 50, 5],
      ["Viasat", "Satellite", 100, 3],
    ],
    evidence: "Previously confirmed for this service location through the FCC National Broadband Map. Final serviceability and current offers still require carrier or DSI confirmation.",
  },
  {
    match: /greenville.*\b29607\b|\b29607\b.*greenville/i,
    providers: [
      ["AT&T", "Fiber", 0, 0],
      ["WOW! Internet, Cable & Phone", "Fiber", 0, 0],
      ["Spectrum", "Cable", 0, 0],
      ["Verizon", "Fixed Wireless", 0, 0],
      ["T-Mobile", "Fixed Wireless", 0, 0],
      ["Starlink", "Satellite", 0, 0],
      ["HughesNet", "Satellite", 0, 0],
      ["Viasat", "Satellite", 0, 0],
    ],
    evidence: "ConnectIQ area intelligence for Greenville, SC 29607. Exact-address availability must be confirmed before ordering.",
  },
];

function lookupAreaIntelligence(address, trace) {
  const record = AREA_INTELLIGENCE.find((item) => item.match.test(address));
  if (!record) {
    trace.push({ source: "connectiq-area-intelligence", status: "empty", detail: "No curated area record matched" });
    return { status: "empty", providers: [] };
  }
  const providers = record.providers.map(([name, technology, download, upload], index) => ({
    id: `area-${slugify(name)}-${index}`,
    name,
    displayName: name,
    technology,
    download,
    upload,
    confidence: 90,
    evidence: record.evidence,
    source: "connectiq-area-intelligence",
    verified: false,
    verificationRequired: true,
  }));
  trace.push({ source: "connectiq-area-intelligence", status: "suggested", detail: `${providers.length} possible providers returned` });
  return { status: "suggested", providers };
}

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

function normalizeProvider(raw, index, source, verified = true) {
  const props = raw?.properties || raw || {};
  const name = text(props.displayName || props.brandName || props.brand_name || props.providerName || props.provider_name || props.name || props.business_name);
  if (!name) return null;
  const providerId = text(props.providerId || props.provider_id || props.id || props.frn);
  return {
    id: providerId || `${slugify(name)}-${index}`,
    providerId,
    name,
    displayName: name,
    technology: normalizeTechnology(props.technology || props.technology_code_type || props.tech),
    download: Number(props.download ?? props.maxdown ?? props.max_download_mbps ?? 0) || 0,
    upload: Number(props.upload ?? props.maxup ?? props.max_upload_mbps ?? 0) || 0,
    source,
    verified,
    verificationRequired: !verified,
    raw,
  };
}

function extractProviderArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of ["providers", "results", "rows", "features", "data"]) {
    const value = payload[key];
    if (Array.isArray(value)) return key === "features" ? value.map((item) => item.properties || item) : value;
  }
  if (Array.isArray(payload?.data?.providers)) return payload.data.providers;
  return [];
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

async function lookupDsi(address, trace) {
  const url = text(process.env.DSI_PROVIDER_LOOKUP_URL);
  if (!enabled("ENABLE_DSI_PROVIDER_LOOKUP") || !url) {
    trace.push({ source: "dsi", status: "disabled", detail: "DSI qualification is not configured yet" });
    return { status: "disabled", providers: [] };
  }
  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${text(process.env.DSI_API_KEY)}` },
      body: JSON.stringify({ address }),
    }, Math.min(Number(process.env.DSI_LOOKUP_TIMEOUT_MS || 7000), 7000));
    const payload = await response.json().catch(() => ({}));
    const providers = dedupeProviders(extractProviderArray(payload).map((row, index) => normalizeProvider(row, index, "dsi", true)));
    trace.push({ source: "dsi", status: providers.length ? "verified" : "empty", detail: `${providers.length} verified providers returned` });
    return { status: providers.length ? "verified" : "empty", providers, httpStatus: response.status };
  } catch (error) {
    const status = error.name === "AbortError" ? "timeout" : "failed";
    trace.push({ source: "dsi", status, detail: error.message });
    return { status, providers: [], error: error.message };
  }
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
    ? "You are ConnectIQ Provider Intelligence with web search. Search the public web for residential internet providers reported for the exact U.S. service address and immediate neighborhood. Use carrier availability pages, local provider pages, broadband comparison sources, and current market evidence. Return JSON only in this exact shape: {\"candidates\":[{\"name\":string,\"confidence\":number,\"technology\":string}]}. Return 4 to 10 named providers when the address is valid. Confidence is 0-100. Do not include explanations, URLs, citations, markdown, plans, prices, or claims that exact serviceability is verified. Prefer terrestrial cable, fiber, DSL, and fixed-wireless providers; place satellite providers last."
    : "You are ConnectIQ Provider Intelligence. Identify 4 to 10 plausible residential internet providers for the exact U.S. service address or immediate locality using the city, ZIP code, and known carrier footprints. Return JSON only in this exact shape: {\"candidates\":[{\"name\":string,\"confidence\":number,\"technology\":string}]}. Do not include explanations, URLs, citations, markdown, or claims that exact availability is verified. Never return an empty list for a valid U.S. address.";

  const body = {
    model,
    max_output_tokens: 850,
    input: [
      { role: "system", content: [{ type: "input_text", text: systemText }] },
      { role: "user", content: [{ type: "input_text", text: `Service address: ${address}` }] },
    ],
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

  // Defensive parser for models that return a short plain-text list despite the JSON instruction.
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
    evidence: "OpenAI identified this provider as a possible option for the address or immediate locality. Final serviceability must be confirmed before ordering.",
    officialVerificationUrl: "",
    source: sourceLabel,
    verified: false,
    verificationRequired: true,
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

  // Run a web-enabled search and a fast footprint lookup in parallel. This reproduces
  // the useful behavior of a ChatGPT web search while keeping the customer wait below 10 seconds.
  const timeoutMs = Math.min(Math.max(Number(process.env.AI_PROVIDER_RESEARCH_TIMEOUT_MS || 9000), 4000), 9500);
  const webModel = process.env.OPENAI_PROVIDER_WEB_MODEL || "gpt-5-mini";
  const fastModel = process.env.OPENAI_PROVIDER_FAST_MODEL || process.env.OPENAI_PROVIDER_RESEARCH_MODEL || "gpt-4.1-mini";

  const webPromise = requestOpenAiProviders({ apiKey, address, model: webModel, useWebSearch: true, timeoutMs })
    .then((payload) => ({ kind: "web", providers: normalizeOpenAiCandidates(payload, "openai-web-search") }))
    .catch((error) => ({ kind: "web", providers: [], error }));
  const fastPromise = requestOpenAiProviders({ apiKey, address, model: fastModel, useWebSearch: false, timeoutMs })
    .then((payload) => ({ kind: "fast", providers: normalizeOpenAiCandidates(payload, "openai") }))
    .catch((error) => ({ kind: "fast", providers: [], error }));

  const [web, fast] = await Promise.all([webPromise, fastPromise]);
  const selected = web.providers.length ? web : fast;
  const providers = selected.providers;

  if (providers.length) {
    trace.push({ source: selected.kind === "web" ? "openai-web-search" : "openai", status: "suggested", detail: `${providers.length} possible providers returned` });
    return { status: "suggested", providers };
  }

  const error = web.error || fast.error;
  const status = error?.name === "AbortError" ? "timeout" : (error ? "failed" : "empty");
  trace.push({ source: "openai", status, detail: error?.message || "No provider candidates returned" });
  return { status, providers: [], error: error?.message || "" };
}

export async function executeProviderWaterfall(address, adapters = {}) {
  const trace = [{ source: "connectiq-intelligence", status: "started", detail: address }];
  // OpenAI is the primary discovery source for both the customer and admin experiences.
  // The request is intentionally lightweight and hard-capped below ten seconds.
  const ai = await (adapters.ai || lookupAiResearch)(address, trace);
  if (ai.providers?.length) return { winner: "openai", providers: ai.providers, trace, sources: { ai: ai.status, dsi: "not_needed", area: "not_needed" } };

  // DSI becomes the authoritative verifier as soon as credentials are available.
  const dsi = await (adapters.dsi || lookupDsi)(address, trace);
  if (dsi.providers?.length) return { winner: "dsi", providers: dsi.providers, trace, sources: { ai: ai.status, dsi: dsi.status, area: "not_needed" } };

  // Curated ConnectIQ intelligence is the last-resort safety net for known markets.
  const area = await (adapters.area || lookupAreaIntelligence)(address, trace);
  if (area.providers?.length) return { winner: "connectiq-area-intelligence", providers: area.providers, trace, sources: { ai: ai.status, dsi: dsi.status, area: area.status } };

  return { winner: "none", providers: [], trace, sources: { ai: ai.status, dsi: dsi.status, area: area.status } };
}

export async function lookupProviderIntelligence(address, options = {}) {
  const normalizedAddress = text(address).replace(/\s+/g, " ");
  const cacheKey = normalizedAddress.toLowerCase();
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS && options.refresh !== true) return { ...cached.value, cache: { hit: true, ageMs: Date.now() - cached.cachedAt } };
  const startedAt = Date.now();
  const waterfall = await executeProviderWaterfall(normalizedAddress);
  const providers = waterfall.providers || [];
  const verifiedProviders = providers.filter((provider) => provider.verified);
  const suggestedProviders = providers.filter((provider) => !provider.verified);
  const result = {
    ok: true,
    address: normalizedAddress,
    matchedAddress: normalizedAddress,
    source: waterfall.winner,
    providerCount: providers.length,
    providers,
    verifiedProviders,
    aiCandidates: suggestedProviders,
    candidateCount: suggestedProviders.length,
    status: verifiedProviders.length ? "verified" : (suggestedProviders.length ? "ai_suggested" : "verification_required"),
    verificationRequired: verifiedProviders.length === 0,
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
    activeWorkflow: "openai_fast_first_then_dsi_then_connectiq_area_fallback",
    dsiEnabled: enabled("ENABLE_DSI_PROVIDER_LOOKUP") && Boolean(text(process.env.DSI_PROVIDER_LOOKUP_URL)),
    aiResearchEnabled: Boolean(text(process.env.OPENAI_API_KEY)) && enabled("ENABLE_AI_PROVIDER_RESEARCH"),
    fccEnabled: false,
  };
}
