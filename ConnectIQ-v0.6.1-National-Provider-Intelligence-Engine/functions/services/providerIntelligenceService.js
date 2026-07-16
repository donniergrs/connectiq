import fetch from "node-fetch";

const CACHE_TTL_MS = Number(process.env.PROVIDER_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const lookupCache = new Map();

function text(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeTechnology(value) {
  const raw = text(value);
  const lower = raw.toLowerCase();
  if (["50", "fiber", "fttp", "fiber to the premises"].some((item) => lower.includes(item))) return "Fiber";
  if (["40", "cable", "docsis"].some((item) => lower.includes(item))) return "Cable";
  if (["70", "71", "72", "fixed wireless"].some((item) => lower.includes(item))) return "Fixed Wireless";
  if (["10", "dsl", "copper"].some((item) => lower.includes(item))) return "DSL";
  if (["60", "satellite"].some((item) => lower.includes(item))) return "Satellite";
  return raw || "Broadband";
}

function normalizeProvider(raw, index, source) {
  const props = raw?.properties || raw || {};
  const name = text(
    props.displayName || props.brandName || props.brand_name || props.providerName || props.provider_name ||
    props.name || props.business_name || props.holding_company_name || props.holding_company,
  );
  if (!name) return null;
  const providerId = text(props.providerId || props.provider_id || props.id || props.frn);
  const download = Number(props.download ?? props.maxdown ?? props.max_download_mbps ?? props.max_advertised_download_speed ?? 0) || 0;
  const upload = Number(props.upload ?? props.maxup ?? props.max_upload_mbps ?? props.max_advertised_upload_speed ?? 0) || 0;
  return {
    id: providerId || `${slugify(name)}-${index}`,
    providerId,
    name,
    displayName: name,
    technology: normalizeTechnology(props.technology || props.technology_code_type || props.technology_code || props.tech),
    download,
    upload,
    lowLatency: Boolean(props.lowLatency ?? props.lowlatency),
    residential: props.residential !== false,
    business: Boolean(props.business || props.bizrescode === "B" || props.bizrescode === "X"),
    source,
    verified: true,
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
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeAddress(address) {
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const response = await fetchWithTimeout(url, {}, 20000);
  if (!response.ok) throw new Error(`Census geocoder failed (${response.status}).`);
  const data = await response.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    matchedAddress: match.matchedAddress,
    latitude: match.coordinates?.y ?? null,
    longitude: match.coordinates?.x ?? null,
    addressComponents: match.addressComponents || {},
  };
}

function fccHeaders() {
  const username = process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME || "";
  const hashValue = process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE || "";
  return username && hashValue ? { username, hash_value: hashValue } : {};
}

async function latestAsOfDate() {
  const base = process.env.FCC_API_BASE_URL || "https://broadbandmap.fcc.gov/api/public/map";
  const response = await fetchWithTimeout(`${base}/listAsOfDates`, { headers: fccHeaders() }, 12000);
  if (!response.ok) return "";
  const payload = await response.json();
  const rows = payload?.data || payload || [];
  if (!Array.isArray(rows)) return "";
  return [...rows].reverse().find((row) => String(row.data_type || row.type || "").toLowerCase().includes("avail"))?.as_of_date || "";
}

function liveFccCandidates({ latitude, longitude, address, asOfDate }) {
  const lat = encodeURIComponent(latitude);
  const lon = encodeURIComponent(longitude);
  const date = encodeURIComponent(asOfDate || "");
  const encodedAddress = encodeURIComponent(address);
  return [
    `https://broadbandmap.fcc.gov/api/public/map/fixed?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/fixedAvailability?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/availability?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/providers?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/location/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/broadband/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/fixed/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/api/public/map/availability?address=${encodedAddress}&as_of_date=${date}`,
  ];
}

async function lookupLiveFcc(address, trace) {
  const geocode = await geocodeAddress(address);
  trace.push({ source: "census-geocoder", status: geocode ? "matched" : "no_match", detail: geocode?.matchedAddress || "Address not matched" });
  if (!geocode?.latitude || !geocode?.longitude) {
    return { status: "address_not_matched", providers: [], geocode, attempts: [] };
  }
  const asOfDate = await latestAsOfDate().catch(() => "");
  const attempts = [];
  for (const url of liveFccCandidates({ ...geocode, address, asOfDate })) {
    try {
      const response = await fetchWithTimeout(url, { headers: fccHeaders() }, Number(process.env.FCC_LOOKUP_TIMEOUT_MS || 9000));
      const bodyText = await response.text();
      let payload = null;
      try { payload = JSON.parse(bodyText); } catch { payload = null; }
      const rows = extractProviderArray(payload);
      const providers = dedupeProviders(rows.map((row, index) => normalizeProvider(row, index, "fcc-live")));
      attempts.push({ url, ok: response.ok, status: response.status, providerCount: providers.length, preview: bodyText.slice(0, 240) });
      if (response.ok && providers.length) {
        trace.push({ source: "fcc-live", status: "verified", detail: `${providers.length} providers returned` });
        return { status: "verified", providers, geocode, asOfDate, attempts };
      }
    } catch (error) {
      attempts.push({ url, ok: false, error: error.name === "AbortError" ? "timeout" : error.message });
    }
  }
  trace.push({ source: "fcc-live", status: "empty", detail: "No provider rows returned by FCC endpoints" });
  return { status: "no_verified_providers", providers: [], geocode, asOfDate, attempts };
}

function parseJsonCandidate(textValue) {
  const raw = text(textValue);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function lookupAiResearch(address, trace) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey || String(process.env.ENABLE_AI_PROVIDER_RESEARCH || "false").toLowerCase() !== "true") {
    trace.push({ source: "ai-research", status: "disabled", detail: "AI provider research is not enabled" });
    return { status: "disabled", candidates: [] };
  }
  const body = {
    model: process.env.OPENAI_PROVIDER_RESEARCH_MODEL || "gpt-5-mini",
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: "Research likely fixed broadband providers for a U.S. street address. Return JSON only with candidates array. Each candidate must contain name, confidence from 0 to 100, evidence, and officialVerificationUrl when known. These are unverified research candidates, not confirmed serviceability." }],
      },
      { role: "user", content: [{ type: "input_text", text: `Address: ${address}` }] },
    ],
  };
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, Number(process.env.AI_PROVIDER_RESEARCH_TIMEOUT_MS || 30000));
  if (!response.ok) throw new Error(`AI research failed (${response.status}).`);
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("\n") || "";
  const parsed = parseJsonCandidate(outputText) || {};
  const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : []).map((candidate, index) => ({
    id: `ai-${slugify(candidate.name || `candidate-${index + 1}`)}`,
    name: text(candidate.name),
    displayName: text(candidate.name),
    confidence: Math.max(0, Math.min(100, Number(candidate.confidence || 0))),
    evidence: text(candidate.evidence),
    officialVerificationUrl: text(candidate.officialVerificationUrl),
    source: "openai-web-research",
    verified: false,
    technology: text(candidate.technology) || "Unknown",
  })).filter((candidate) => candidate.name);
  trace.push({ source: "ai-research", status: candidates.length ? "candidates_found" : "empty", detail: `${candidates.length} unverified candidates` });
  return { status: candidates.length ? "candidates_found" : "empty", candidates };
}

export async function lookupProviderIntelligence(address, options = {}) {
  const normalizedAddress = text(address).replace(/\s+/g, " ");
  const cacheKey = normalizedAddress.toLowerCase();
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS && options.refresh !== true) {
    return { ...cached.value, cache: { hit: true, ageMs: Date.now() - cached.cachedAt } };
  }

  const trace = [{ source: "provider-engine", status: "started", detail: normalizedAddress }];
  const startedAt = Date.now();
  let fccResult;
  try {
    fccResult = await lookupLiveFcc(normalizedAddress, trace);
  } catch (error) {
    fccResult = { status: error.name === "AbortError" ? "timeout" : "failed", providers: [], error: error.message, attempts: [] };
    trace.push({ source: "fcc-live", status: fccResult.status, detail: error.message });
  }

  let aiResult = { status: "not_needed", candidates: [] };
  if (!fccResult.providers.length && options.includeAiResearch !== false) {
    try {
      aiResult = await lookupAiResearch(normalizedAddress, trace);
    } catch (error) {
      aiResult = { status: "failed", candidates: [], error: error.message };
      trace.push({ source: "ai-research", status: "failed", detail: error.message });
    }
  }

  const result = {
    ok: fccResult.status !== "failed" && fccResult.status !== "timeout",
    address: normalizedAddress,
    matchedAddress: fccResult.geocode?.matchedAddress || "",
    source: fccResult.providers.length ? "fcc-live" : "provider-intelligence-waterfall",
    providerCount: fccResult.providers.length,
    providers: fccResult.providers,
    verifiedProviders: fccResult.providers,
    aiCandidates: aiResult.candidates,
    candidateCount: aiResult.candidates.length,
    status: fccResult.providers.length ? "verified" : fccResult.status,
    verificationRequired: !fccResult.providers.length,
    recommendationEligible: fccResult.providers.length > 0,
    fcc: { ...fccResult, providers: undefined },
    ai: { ...aiResult, candidates: undefined },
    trace,
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
    fccCredentialsConfigured: Boolean((process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME) && (process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE)),
    aiResearchEnabled: Boolean(process.env.OPENAI_API_KEY) && String(process.env.ENABLE_AI_PROVIDER_RESEARCH || "false").toLowerCase() === "true",
    staticAvailabilityEnabled: false,
  };
}
