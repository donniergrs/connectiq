import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 5001;

const MOCK_PROVIDERS = [
  { id: "lumos", name: "Lumos Fiber", technology: "Fiber", download: 5000, upload: 5000, source: "fallback" },
  { id: "att", name: "AT&T Fiber", technology: "Fiber", download: 5000, upload: 5000, source: "fallback" },
  { id: "spectrum", name: "Spectrum", technology: "Cable", download: 1000, upload: 40, source: "fallback" },
];

function getFccConfig() {
  return {
    username: process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME,
    hashValue: process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE,
    baseUrl: process.env.FCC_API_BASE_URL || process.env.VITE_FCC_API_BASE_URL || "https://broadbandmap.fcc.gov/api/public/map",
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readBody(response) {
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { text, json };
}

function safePreview(value, max = 900) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.slice(0, max);
}

function buildHeaders(style = "underscore") {
  const { username, hashValue } = getFccConfig();
  if (style === "dash") return { username, "hash-value": hashValue };
  if (style === "bearer") return { Authorization: `Bearer ${hashValue}`, username };
  return { username, hash_value: hashValue };
}

function normalizeTechnology(value) {
  const text = String(value || "").toLowerCase();
  if (["50", "fiber", "fiber to the premises", "fttp"].some((x) => text.includes(x))) return "Fiber";
  if (["40", "cable", "docsis"].some((x) => text.includes(x))) return "Cable";
  if (["71", "72", "70", "fixed wireless", "licensed fixed wireless", "unlicensed fixed wireless"].some((x) => text.includes(x))) return "Fixed Wireless";
  if (["10", "dsl", "copper"].some((x) => text.includes(x))) return "DSL";
  if (["60", "satellite"].some((x) => text.includes(x))) return "Satellite";
  return value || "Broadband";
}

function slugify(value) {
  return String(value || "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeProvider(raw, index = 0) {
  const props = raw?.properties || raw || {};
  const name =
    props.name || props.provider_name || props.brand_name || props.provider || props.business_name ||
    props.holding_company || props.frn_name || props.dbaname || props.dba_name || props.company || `Provider ${index + 1}`;

  const download = Number(
    props.max_download_mbps || props.max_advertised_download_speed || props.download || props.max_down || props.maxdown || props.downspeed || props.maxaddown || 0
  );
  const upload = Number(
    props.max_upload_mbps || props.max_advertised_upload_speed || props.upload || props.max_up || props.maxup || props.upspeed || props.maxadup || 0
  );

  return {
    id: String(props.id || props.provider_id || props.frn || props.holding_company_number || `${slugify(name)}-${index}`),
    name,
    technology: normalizeTechnology(props.technology || props.tech || props.technology_code || props.tech_code || props.category),
    download,
    upload,
    source: props.source || "fcc-explorer",
    raw,
  };
}

function extractProviderArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.providers)) return payload.providers;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.features)) return payload.features.map((f) => ({ ...(f.properties || {}), geometry: f.geometry }));
  if (payload.data && Array.isArray(payload.data.providers)) return payload.data.providers;
  if (payload.response && Array.isArray(payload.response.providers)) return payload.response.providers;
  return [];
}

function rankProviders(providers = []) {
  return providers
    .map((provider) => {
      let score = 45;
      if (provider.technology === "Fiber") score += 35;
      if (provider.technology === "Cable") score += 18;
      if (provider.technology === "Fixed Wireless") score += 8;
      if (provider.download >= 1000) score += 10;
      if (provider.upload >= 1000) score += 8;
      if (provider.upload >= provider.download * 0.75 && provider.upload > 0) score += 4;
      return { ...provider, score: Math.min(100, Math.round(score)) };
    })
    .sort((a, b) => b.score - a.score || b.download - a.download || b.upload - a.upload);
}

async function geocodeAddress(address) {
  const query = encodeURIComponent(address);
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${query}&benchmark=Public_AR_Current&format=json`;
  const response = await fetchWithTimeout(url, {}, 10000);
  if (!response.ok) throw new Error(`Census geocoder failed with ${response.status}`);
  const data = await response.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    matchedAddress: match.matchedAddress,
    latitude: match.coordinates?.y ?? null,
    longitude: match.coordinates?.x ?? null,
    tigerLineId: match.tigerLine?.tigerLineId || null,
    addressComponents: match.addressComponents || {},
    raw: match,
  };
}

async function getFccAsOfDates(timeoutMs = 12000) {
  const { baseUrl } = getFccConfig();
  const response = await fetchWithTimeout(`${baseUrl}/listAsOfDates`, { method: "GET", headers: buildHeaders("underscore") }, timeoutMs);
  const body = await readBody(response);
  return { ok: response.ok, status: response.status, data: body.json, preview: safePreview(body.json || body.text) };
}

function buildCandidateUrls({ lat, lon, address, asOfDate }) {
  const encodedAddress = encodeURIComponent(address || "");
  const date = encodeURIComponent(asOfDate || "");
  return [
    // Confirmed authenticated family is /api/public/map. These endpoint names are intentionally tested safely.
    `https://broadbandmap.fcc.gov/api/public/map/fixed?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/fixedAvailability?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/location?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/availability?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/provider?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/providers?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,

    // NBM frontend API candidates used by the public map application.
    `https://broadbandmap.fcc.gov/nbm/map/api/location/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/broadband/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/fixed/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/provider/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/providers?latitude=${lat}&longitude=${lon}`,

    // Address variants, in case endpoint accepts plain address.
    `https://broadbandmap.fcc.gov/api/public/map/location?address=${encodedAddress}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/availability?address=${encodedAddress}&as_of_date=${date}`,
  ];
}

async function testCandidate(url, index) {
  const headerStyles = ["underscore", "dash"];
  const attempts = [];

  for (const style of headerStyles) {
    try {
      const response = await fetchWithTimeout(url, { method: "GET", headers: buildHeaders(style) }, 8500);
      const body = await readBody(response);
      const rows = extractProviderArray(body.json);
      const providers = rows.map((row, rowIndex) => normalizeProvider(row, rowIndex));
      attempts.push({
        index,
        authStyle: style,
        url,
        ok: response.ok,
        status: response.status,
        providerCount: providers.length,
        providers: rankProviders(providers),
        preview: safePreview(body.json || body.text, 1200),
      });
      if (response.ok && providers.length) break;
    } catch (error) {
      attempts.push({ index, authStyle: style, url, ok: false, error: error.name === "AbortError" ? "Timed out" : error.message });
    }
  }

  return attempts;
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "connectiq-functions" }));

app.get("/api/fcc/diagnostic", async (req, res) => {
  try {
    const { username, hashValue, baseUrl } = getFccConfig();
    const asOf = await getFccAsOfDates();
    res.json({
      ok: asOf.ok,
      baseUrl,
      hasUsername: Boolean(username),
      username,
      hashLength: hashValue?.length || 0,
      hashStartsWith: hashValue?.slice(0, 4) || "",
      hashEndsWith: hashValue?.slice(-4) || "",
      asOf,
    });
  } catch (error) {
    res.json({ ok: false, error: error.name === "AbortError" ? "The operation was aborted." : error.message });
  }
});

app.post("/api/fcc/explore", async (req, res) => {
  const address = req.body?.address || req.body?.street || req.body?.full || "";
  const suppliedLat = req.body?.latitude;
  const suppliedLon = req.body?.longitude;
  const limit = Math.max(1, Math.min(Number(req.body?.limit || 13), 20));
  const notes = [];

  try {
    let geocode = null;
    if (suppliedLat && suppliedLon) {
      geocode = { latitude: Number(suppliedLat), longitude: Number(suppliedLon), matchedAddress: address || "Manual coordinates" };
    } else {
      if (!address) return res.status(400).json({ ok: false, error: "Address or coordinates are required." });
      geocode = await geocodeAddress(address);
      if (!geocode) return res.json({ ok: false, error: "Address could not be geocoded.", address });
    }

    const asOf = await getFccAsOfDates().catch((error) => {
      notes.push(`As-of date check failed: ${error.message}`);
      return null;
    });

    const dateRows = asOf?.data?.data || asOf?.data || [];
    const latestAvailability = Array.isArray(dateRows)
      ? [...dateRows].reverse().find((row) => String(row.data_type || row.type || "").toLowerCase().includes("avail"))
      : null;
    const asOfDate = latestAvailability?.as_of_date || req.body?.asOfDate || "";

    const urls = buildCandidateUrls({ lat: geocode.latitude, lon: geocode.longitude, address, asOfDate }).slice(0, limit);
    const allAttempts = [];

    for (let i = 0; i < urls.length; i++) {
      const attempts = await testCandidate(urls[i], i + 1);
      allAttempts.push(...attempts);
      const success = attempts.find((attempt) => attempt.ok && attempt.providerCount > 0);
      if (success && req.body?.stopOnSuccess !== false) break;
    }

    const best = allAttempts.find((attempt) => attempt.ok && attempt.providerCount > 0) || null;

    res.json({
      ok: Boolean(best),
      source: best ? "fcc-explorer" : "explorer-no-provider-rows",
      address,
      geocode,
      asOfDate,
      asOfOk: Boolean(asOf?.ok),
      notes,
      best,
      providers: best?.providers || [],
      attempts: allAttempts.map((attempt) => ({ ...attempt, providers: attempt.providers?.slice(0, 10) || [] })),
    });
  } catch (error) {
    res.json({ ok: false, error: error.name === "AbortError" ? "Timed out" : error.message, notes });
  }
});

app.post("/api/fcc/lookup", async (req, res) => {
  const address = req.body?.address || req.body?.street || req.body?.full || "";
  const notes = [];

  try {
    const explore = await fetch(`http://localhost:${PORT}/api/fcc/explore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, limit: 13, stopOnSuccess: true }),
    });
    const data = await explore.json();
    if (data?.providers?.length) {
      return res.json({ ...data, ok: true, source: "fcc-live", message: "Live FCC provider rows returned." });
    }
    notes.push("FCC endpoint explorer did not find provider rows yet.");
    return res.json({
      ok: true,
      source: "fallback",
      message: "FCC authentication/geocoding is active; provider endpoint mapping still needs final endpoint confirmation. Returned ConnectIQ fallback providers.",
      address,
      geocode: data?.geocode || null,
      providerCount: MOCK_PROVIDERS.length,
      providers: rankProviders(MOCK_PROVIDERS),
      explorer: data,
      notes,
    });
  } catch (error) {
    return res.json({
      ok: true,
      source: "fallback",
      message: "FCC lookup failed safely. Returned ConnectIQ fallback providers.",
      address,
      providerCount: MOCK_PROVIDERS.length,
      providers: rankProviders(MOCK_PROVIDERS),
      notes: [`Lookup error: ${error.message}`],
    });
  }
});

app.listen(PORT, () => console.log(`ConnectIQ backend running on port ${PORT}`));
