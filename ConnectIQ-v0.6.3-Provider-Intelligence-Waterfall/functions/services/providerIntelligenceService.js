import { getBdcStatus, lookupBdcByAddress } from "./bdcRepository.js";

const CACHE_TTL_MS = Number(process.env.PROVIDER_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const lookupCache = new Map();

const text = (value) => String(value ?? "").trim();
const enabled = (name, fallback = false) => String(process.env[name] ?? fallback).toLowerCase() === "true";
const slugify = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function normalizeTechnology(value) {
  const raw = text(value);
  const lower = raw.toLowerCase();
  if (["50", "fiber", "fttp", "fiber to the premises"].some((item) => lower.includes(item))) return "Fiber";
  if (["40", "cable", "docsis"].some((item) => lower.includes(item))) return "Cable";
  if (["70", "71", "72", "fixed wireless"].some((item) => lower.includes(item))) return "Fixed Wireless";
  if (["10", "dsl", "copper"].some((item) => lower.includes(item))) return "DSL";
  if (["60", "61", "satellite"].some((item) => lower.includes(item))) return "Satellite";
  return raw || "Broadband";
}

function normalizeProvider(raw, index, source, verified = true) {
  const props = raw?.properties || raw || {};
  const name = text(props.displayName || props.brandName || props.brand_name || props.providerName || props.provider_name || props.name || props.business_name || props.holding_company_name || props.holding_company);
  if (!name) return null;
  const providerId = text(props.providerId || props.provider_id || props.id || props.frn);
  return {
    id: providerId || `${slugify(name)}-${index}`,
    providerId,
    name,
    displayName: name,
    technology: normalizeTechnology(props.technology || props.technology_code_type || props.technology_code || props.tech),
    download: Number(props.download ?? props.maxdown ?? props.max_download_mbps ?? props.max_advertised_download_speed ?? 0) || 0,
    upload: Number(props.upload ?? props.maxup ?? props.max_upload_mbps ?? props.max_advertised_upload_speed ?? 0) || 0,
    lowLatency: Boolean(props.lowLatency ?? props.lowlatency),
    residential: props.residential !== false,
    business: Boolean(props.business || props.bizrescode === "B" || props.bizrescode === "X"),
    source,
    verified,
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
  if (Array.isArray(payload?.response?.providers)) return payload.response.providers;
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

async function geocodeAddress(address) {
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const response = await fetchWithTimeout(url, {}, Number(process.env.GEOCODER_TIMEOUT_MS || 15000));
  if (!response.ok) throw new Error(`Census geocoder failed (${response.status}).`);
  const data = await response.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return { matchedAddress: match.matchedAddress, latitude: match.coordinates?.y ?? null, longitude: match.coordinates?.x ?? null, addressComponents: match.addressComponents || {} };
}

function fccHeaders() {
  const username = process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME || "";
  const hashValue = process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE || "";
  return username && hashValue ? { username, hash_value: hashValue, Accept: "application/json" } : { Accept: "application/json" };
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, encodeURIComponent(value ?? "")), template);
}

async function lookupOfficialFcc(address, trace) {
  // The National Broadband Map Fabric endpoint captured in the HAR explicitly prohibits scripted access.
  // This adapter therefore uses only a separately configured FCC public-data endpoint.
  const template = text(process.env.FCC_PROVIDER_LOOKUP_URL_TEMPLATE);
  if (!template) {
    trace.push({ source: "fcc-public-api", status: "not_configured", detail: "Official FCC provider lookup URL template is not configured" });
    return { status: "not_configured", providers: [] };
  }
  const geocode = await geocodeAddress(address);
  trace.push({ source: "census-geocoder", status: geocode ? "matched" : "no_match", detail: geocode?.matchedAddress || "Address not matched" });
  if (!geocode?.latitude || !geocode?.longitude) return { status: "address_not_matched", providers: [], geocode };
  const url = renderTemplate(template, { address, lat: geocode.latitude, lon: geocode.longitude, latitude: geocode.latitude, longitude: geocode.longitude });
  try {
    const response = await fetchWithTimeout(url, { headers: fccHeaders() }, Number(process.env.FCC_LOOKUP_TIMEOUT_MS || 10000));
    const bodyText = await response.text();
    let payload = null;
    try { payload = JSON.parse(bodyText); } catch { payload = null; }
    const providers = dedupeProviders(extractProviderArray(payload).map((row, index) => normalizeProvider(row, index, "fcc-public-api", true)));
    const status = response.ok ? (providers.length ? "verified" : "empty") : `http_${response.status}`;
    trace.push({ source: "fcc-public-api", status, detail: providers.length ? `${providers.length} providers returned` : `No provider rows returned (${response.status})` });
    return { status, providers, geocode, httpStatus: response.status };
  } catch (error) {
    const status = error.name === "AbortError" ? "timeout" : "failed";
    trace.push({ source: "fcc-public-api", status, detail: error.message });
    return { status, providers: [], geocode, error: error.message };
  }
}

async function lookupDsi(address, trace) {
  const endpoint = text(process.env.DSI_PROVIDER_LOOKUP_URL);
  const apiKey = text(process.env.DSI_API_KEY);
  if (!enabled("ENABLE_DSI_PROVIDER_LOOKUP") || !endpoint) {
    trace.push({ source: "dsi", status: "disabled", detail: "DSI provider lookup is not configured" });
    return { status: "disabled", providers: [] };
  }
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ address }),
    }, Number(process.env.DSI_LOOKUP_TIMEOUT_MS || 10000));
    const payload = await response.json().catch(() => null);
    const providers = dedupeProviders(extractProviderArray(payload).map((row, index) => normalizeProvider(row, index, "dsi", true)));
    const status = response.ok ? (providers.length ? "verified" : "empty") : `http_${response.status}`;
    trace.push({ source: "dsi", status, detail: providers.length ? `${providers.length} providers returned` : `No provider rows returned (${response.status})` });
    return { status, providers, httpStatus: response.status };
  } catch (error) {
    const status = error.name === "AbortError" ? "timeout" : "failed";
    trace.push({ source: "dsi", status, detail: error.message });
    return { status, providers: [], error: error.message };
  }
}

function parseJsonCandidate(value) {
  const match = text(value).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function lookupAiResearch(address, trace) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey || !enabled("ENABLE_AI_PROVIDER_RESEARCH")) {
    trace.push({ source: "ai-research", status: "disabled", detail: "AI provider research is not enabled" });
    return { status: "disabled", candidates: [] };
  }
  const body = {
    model: process.env.OPENAI_PROVIDER_RESEARCH_MODEL || "gpt-5-mini",
    tools: [{ type: "web_search_preview" }],
    input: [
      { role: "system", content: [{ type: "input_text", text: "Research likely fixed broadband providers for a U.S. street address. Return JSON only with candidates array. Each candidate must contain name, confidence from 0 to 100, evidence, technology, and officialVerificationUrl when known. These are unverified research candidates, not confirmed serviceability." }] },
      { role: "user", content: [{ type: "input_text", text: `Address: ${address}` }] },
    ],
  };
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }, Number(process.env.AI_PROVIDER_RESEARCH_TIMEOUT_MS || 30000));
  if (!response.ok) throw new Error(`AI research failed (${response.status}).`);
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("\n") || "";
  const parsed = parseJsonCandidate(outputText) || {};
  const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : []).map((candidate, index) => ({
    id: `ai-${slugify(candidate.name || `candidate-${index + 1}`)}`, name: text(candidate.name), displayName: text(candidate.name),
    confidence: Math.max(0, Math.min(100, Number(candidate.confidence || 0))), evidence: text(candidate.evidence),
    officialVerificationUrl: text(candidate.officialVerificationUrl), source: "openai-web-research", verified: false,
    technology: text(candidate.technology) || "Unknown",
  })).filter((candidate) => candidate.name);
  trace.push({ source: "ai-research", status: candidates.length ? "candidates_found" : "empty", detail: `${candidates.length} unverified candidates` });
  return { status: candidates.length ? "candidates_found" : "empty", candidates };
}

export async function executeProviderWaterfall(address, adapters = {}, options = {}) {
  const trace = [{ source: "provider-engine", status: "started", detail: address }];
  const fcc = adapters.fcc || lookupOfficialFcc;
  const dsi = adapters.dsi || lookupDsi;
  const ai = adapters.ai || lookupAiResearch;

  // FCC source 1: imported BDC repository. It is safe, local, and address-level when loaded.
  const bdcResult = adapters.bdc ? await adapters.bdc(address, trace) : lookupBdcByAddress(address);
  trace.push({ source: "fcc-bdc-download", status: bdcResult.status, detail: bdcResult.providers?.length ? `${bdcResult.providers.length} providers returned` : "No imported FCC BDC result" });
  if (bdcResult.providers?.length) return { winner: "fcc-bdc-download", verified: bdcResult, ai: { status: "not_needed", candidates: [] }, trace };

  const fccResult = await fcc(address, trace);
  if (fccResult.providers?.length) return { winner: "fcc-public-api", verified: fccResult, ai: { status: "not_needed", candidates: [] }, trace };

  const dsiResult = await dsi(address, trace);
  if (dsiResult.providers?.length) return { winner: "dsi", verified: dsiResult, ai: { status: "not_needed", candidates: [] }, trace };

  const aiResult = options.includeAiResearch === false ? { status: "skipped", candidates: [] } : await ai(address, trace);
  return {
    winner: aiResult.candidates?.length ? "ai-research" : "none",
    verified: { status: dsiResult.status || fccResult.status || bdcResult.status || "empty", providers: [] },
    ai: aiResult,
    trace,
    sources: { bdc: bdcResult.status, fcc: fccResult.status, dsi: dsiResult.status, ai: aiResult.status },
  };
}

export async function lookupProviderIntelligence(address, options = {}) {
  const normalizedAddress = text(address).replace(/\s+/g, " ");
  const cacheKey = normalizedAddress.toLowerCase();
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS && options.refresh !== true) return { ...cached.value, cache: { hit: true, ageMs: Date.now() - cached.cachedAt } };

  const startedAt = Date.now();
  const waterfall = await executeProviderWaterfall(normalizedAddress, {}, options);
  const verifiedProviders = waterfall.verified.providers || [];
  const result = {
    ok: true,
    address: normalizedAddress,
    matchedAddress: waterfall.verified.geocode?.matchedAddress || normalizedAddress,
    source: waterfall.winner,
    providerCount: verifiedProviders.length,
    providers: verifiedProviders,
    verifiedProviders,
    aiCandidates: waterfall.ai.candidates || [],
    candidateCount: waterfall.ai.candidates?.length || 0,
    status: verifiedProviders.length ? "verified" : (waterfall.ai.candidates?.length ? "ai_suggested" : "verification_required"),
    verificationRequired: !verifiedProviders.length,
    recommendationEligible: verifiedProviders.length > 0,
    bdc: { dataset: getBdcStatus() },
    waterfall: waterfall.sources || {},
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
    bdc: getBdcStatus(),
    fccPublicApiConfigured: Boolean(text(process.env.FCC_PROVIDER_LOOKUP_URL_TEMPLATE)),
    dsiEnabled: enabled("ENABLE_DSI_PROVIDER_LOOKUP") && Boolean(text(process.env.DSI_PROVIDER_LOOKUP_URL)),
    aiResearchEnabled: Boolean(process.env.OPENAI_API_KEY) && enabled("ENABLE_AI_PROVIDER_RESEARCH"),
    staticAvailabilityEnabled: false,
    scriptedFabricAccessEnabled: false,
  };
}
