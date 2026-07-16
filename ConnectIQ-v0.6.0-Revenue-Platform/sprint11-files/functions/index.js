import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

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
    baseUrl:
      process.env.FCC_API_BASE_URL ||
      process.env.VITE_FCC_API_BASE_URL ||
      "https://broadbandmap.fcc.gov/api/public/map",
    broadbandMapApiKey: process.env.BROADBANDMAP_API_KEY || "",
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTechnology(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("fiber") || text.includes("50")) return "Fiber";
  if (text.includes("cable") || text.includes("40")) return "Cable";
  if (text.includes("wireless") || text.includes("70")) return "Fixed Wireless";
  if (text.includes("dsl") || text.includes("10")) return "DSL";
  if (text.includes("satellite") || text.includes("60")) return "Satellite";
  return value || "Broadband";
}

function normalizeProvider(raw, index = 0) {
  const name =
    raw.name ||
    raw.provider_name ||
    raw.brand_name ||
    raw.holding_company ||
    raw.provider ||
    raw.business_name ||
    `Provider ${index + 1}`;

  const download = Number(
    raw.max_download_mbps ||
      raw.download ||
      raw.max_advertised_download_speed ||
      raw.max_down ||
      raw.maxdown ||
      0
  );

  const upload = Number(
    raw.max_upload_mbps ||
      raw.upload ||
      raw.max_advertised_upload_speed ||
      raw.max_up ||
      raw.maxup ||
      0
  );

  return {
    id: String(raw.id || raw.provider_id || raw.frn || `${slugify(name)}-${index}`),
    name,
    technology: normalizeTechnology(raw.technology || raw.tech || raw.technology_code),
    download,
    upload,
    source: raw.source || "fcc",
    raw,
  };
}

function slugify(value) {
  return String(value || "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function rankProviders(providers = []) {
  return providers
    .map((provider) => {
      let score = 50;
      if (provider.technology === "Fiber") score += 35;
      if (provider.technology === "Cable") score += 18;
      if (provider.technology === "Fixed Wireless") score += 8;
      if (provider.download >= 1000) score += 10;
      if (provider.upload >= 1000) score += 8;
      if (provider.upload >= provider.download * 0.75 && provider.upload > 0) score += 4;
      return {
        ...provider,
        score: Math.min(100, Math.round(score)),
      };
    })
    .sort((a, b) => b.score - a.score || b.download - a.download);
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
    raw: match,
  };
}

function extractProviderArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.providers)) return payload.providers;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.features)) return payload.features.map((f) => ({ ...(f.properties || {}), geometry: f.geometry }));
  if (payload.data && Array.isArray(payload.data.providers)) return payload.data.providers;
  return [];
}

async function getFccAsOfDates() {
  const { username, hashValue, baseUrl } = getFccConfig();
  if (!username || !hashValue) {
    return { ok: false, status: 0, data: null, message: "FCC credentials missing." };
  }

  const response = await fetchWithTimeout(`${baseUrl}/listAsOfDates`, {
    method: "GET",
    headers: { username, hash_value: hashValue },
  });

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    preview: typeof text === "string" ? text.slice(0, 500) : "",
  };
}

async function lookupViaBroadbandMapApi(geocode) {
  const { broadbandMapApiKey } = getFccConfig();
  if (!broadbandMapApiKey || !geocode?.latitude || !geocode?.longitude) return null;

  const url = `https://broadbandmap.com/api/v1/location/internet?lat=${geocode.latitude}&lng=${geocode.longitude}&service_type=residential`;
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${broadbandMapApiKey}` },
  });

  if (!response.ok) {
    return { ok: false, status: response.status, providers: [], source: "broadbandmap.com" };
  }

  const data = await response.json();
  const providers = extractProviderArray(data).map((item, index) =>
    normalizeProvider({ ...item, source: "broadbandmap.com" }, index)
  );

  return { ok: true, status: 200, providers, source: "broadbandmap.com", raw: data };
}

async function lookupViaFccCandidates(geocode) {
  const { username, hashValue } = getFccConfig();
  if (!username || !hashValue || !geocode?.latitude || !geocode?.longitude) return null;

  // FCC's authenticated listAsOfDates is confirmed. The public docs do not expose a simple
  // address-to-provider endpoint name consistently, so this adapter tries known map-style
  // endpoint patterns safely and reports diagnostics without breaking the customer flow.
  const lat = geocode.latitude;
  const lon = geocode.longitude;
  const candidates = [
    `https://broadbandmap.fcc.gov/nbm/map/api/location/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/broadband/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/fixed/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/api/public/map/location?latitude=${lat}&longitude=${lon}`,
  ];

  const diagnostics = [];

  for (const url of candidates) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: { username, hash_value: hashValue },
      }, 7000);
      const text = await response.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      const providers = extractProviderArray(data).map((item, index) => normalizeProvider(item, index));
      diagnostics.push({ url, status: response.status, ok: response.ok, providerCount: providers.length, preview: text.slice(0, 150) });
      if (response.ok && providers.length) {
        return { ok: true, source: "fcc-candidate", providers, diagnostics, raw: data };
      }
    } catch (error) {
      diagnostics.push({ url, ok: false, error: error.name === "AbortError" ? "Timed out" : error.message });
    }
  }

  return { ok: false, source: "fcc-candidate", providers: [], diagnostics };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "connectiq-functions" });
});

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
    res.json({ ok: false, error: error.message });
  }
});

app.post("/api/geocode", async (req, res) => {
  try {
    const address = req.body?.address || req.body?.street || req.body?.full;
    if (!address) return res.status(400).json({ ok: false, error: "Address is required." });
    const geocode = await geocodeAddress(address);
    res.json({ ok: Boolean(geocode), geocode });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

app.post("/api/fcc/lookup", async (req, res) => {
  const street = req.body?.street || req.body?.full || req.body?.address || "";
  console.log("FCC lookup request received:", { street });

  let geocode = null;
  let asOf = null;
  let liveLookup = null;
  const notes = [];

  try {
    if (street) {
      geocode = await geocodeAddress(street);
      if (!geocode) notes.push("Address could not be geocoded by Census.");
    }
  } catch (error) {
    notes.push(`Geocode failed: ${error.message}`);
  }

  try {
    asOf = await getFccAsOfDates();
    if (!asOf.ok) notes.push(`FCC auth/as-of-date check failed with status ${asOf.status}.`);
  } catch (error) {
    notes.push(`FCC diagnostic failed: ${error.message}`);
  }

  try {
    liveLookup = await lookupViaBroadbandMapApi(geocode);
    if (liveLookup?.ok && liveLookup.providers.length) {
      const providers = rankProviders(liveLookup.providers);
      return res.json({
        ok: true,
        source: liveLookup.source,
        message: "Live provider lookup returned results.",
        address: street,
        geocode,
        asOf,
        providerCount: providers.length,
        providers,
        notes,
      });
    }
  } catch (error) {
    notes.push(`BroadbandMap.com adapter failed: ${error.message}`);
  }

  try {
    const fccCandidate = await lookupViaFccCandidates(geocode);
    if (fccCandidate?.ok && fccCandidate.providers.length) {
      const providers = rankProviders(fccCandidate.providers);
      return res.json({
        ok: true,
        source: fccCandidate.source,
        message: "FCC candidate lookup returned results.",
        address: street,
        geocode,
        asOf,
        diagnostics: fccCandidate.diagnostics,
        providerCount: providers.length,
        providers,
        notes,
      });
    }

    if (fccCandidate?.diagnostics) notes.push("FCC provider endpoint candidates did not return provider rows yet.");
  } catch (error) {
    notes.push(`FCC candidate adapter failed: ${error.message}`);
  }

  const providers = rankProviders(MOCK_PROVIDERS);
  return res.json({
    ok: true,
    source: "fallback",
    message: "FCC authentication/geocoding is active; provider endpoint mapping still needs final FCC endpoint confirmation. Returned ConnectIQ fallback providers.",
    address: street,
    geocode,
    asOf,
    providerCount: providers.length,
    providers,
    notes,
  });
});

app.listen(PORT, () => {
  console.log(`ConnectIQ backend running on port ${PORT}`);
});
