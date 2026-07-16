import fetch from "node-fetch";

const DEFAULT_FABRIC_ID = "8c672e4b-9442-44ee-8da7-3f352fc8d946";
const DEFAULT_FABRIC_VINTAGE = "2025-12-31";
const FABRIC_BASE_URL = "https://broadbandmap.fcc.gov/nbm/map/api/fabric";
const PUBLIC_MAP_BASE_URL = "https://broadbandmap.fcc.gov/api/public/map";

export function getFccRuntimeConfig() {
  return {
    username: process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME || "",
    hashValue: process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE || "",
    fabricId: process.env.FCC_FABRIC_ID || DEFAULT_FABRIC_ID,
    fabricVintage: process.env.FCC_FABRIC_VINTAGE || DEFAULT_FABRIC_VINTAGE,
    publicMapBaseUrl: process.env.FCC_API_BASE_URL || process.env.VITE_FCC_API_BASE_URL || PUBLIC_MAP_BASE_URL,
  };
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildAuthHeaders() {
  const { username, hashValue } = getFccRuntimeConfig();
  return {
    username,
    hash_value: hashValue,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

export async function testFccAuth() {
  const { username, hashValue, publicMapBaseUrl } = getFccRuntimeConfig();

  const response = await fetchWithTimeout(`${publicMapBaseUrl}/listAsOfDates`, {
    method: "GET",
    headers: buildAuthHeaders(),
  }, 12000);

  const data = await readJson(response);

  return {
    ok: response.ok,
    status: response.status,
    baseUrl: publicMapBaseUrl,
    username,
    hashLength: hashValue.length,
    hashStartsWith: hashValue.slice(0, 4),
    hashEndsWith: hashValue.slice(-4),
    asOf: {
      ok: response.ok,
      status: response.status,
      preview: JSON.stringify(data).slice(0, 900),
      data,
    },
  };
}

export async function searchFabricAddress(address, options = {}) {
  const { fabricId } = getFccRuntimeConfig();
  const activeFabricId = options.fabricId || fabricId;

  if (!address || !String(address).trim()) {
    throw new Error("Address is required.");
  }

  const url = `${FABRIC_BASE_URL}/address/${activeFabricId}/${encodeURIComponent(address.trim())}`;
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: buildAuthHeaders(),
  }, 12000);

  const data = await readJson(response);

  if (!response.ok || data?.status_code >= 400) {
    throw new Error(`FCC address search failed (${response.status || data?.status_code}).`);
  }

  const rows = Array.isArray(data?.data) ? data.data : [];

  return {
    ok: rows.length > 0,
    fabricId: activeFabricId,
    query: address,
    resultCount: rows.length,
    candidates: rows,
    bestLocation: chooseBestAddressMatch(rows, address),
    raw: data,
  };
}

function chooseBestAddressMatch(rows, inputAddress) {
  if (!rows.length) return null;
  const input = String(inputAddress || "").toLowerCase();

  const zipMatch = input.match(/\b\d{5}\b/);
  if (zipMatch) {
    const exactZip = rows.find((row) => String(row.zip_code || "") === zipMatch[0]);
    if (exactZip) return exactZip;
  }

  return rows[0];
}

export async function getFabricProviderDetail(locationId, options = {}) {
  const { fabricId, fabricVintage } = getFccRuntimeConfig();
  const activeFabricId = options.fabricId || fabricId;
  const activeVintage = options.fabricVintage || fabricVintage;

  if (!locationId) {
    throw new Error("FCC location_id is required.");
  }

  const url = `${FABRIC_BASE_URL}/detail/${activeFabricId}/${locationId}?fabric_vintage=${encodeURIComponent(activeVintage)}`;
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: buildAuthHeaders(),
  }, 15000);

  const data = await readJson(response);

  if (!response.ok || data?.status_code >= 400) {
    throw new Error(`FCC provider detail failed (${response.status || data?.status_code}).`);
  }

  const detailRoot = Array.isArray(data?.data) ? data.data[0] : null;
  const providerRows = Array.isArray(detailRoot?.detail) ? detailRoot.detail : [];

  return {
    ok: providerRows.length > 0,
    fabricId: activeFabricId,
    fabricVintage: activeVintage,
    locationId,
    location: detailRoot ? {
      address_primary: detailRoot.address_primary,
      city: detailRoot.city,
      state: detailRoot.state,
      zip_code: detailRoot.zip_code,
      coordinates: detailRoot.coordinates,
      bounds: detailRoot.bounds,
      unitCount: detailRoot.unitCount,
      buildingTypeCode: detailRoot.buildingTypeCode,
      bsl_flag: detailRoot.bsl_flag,
    } : null,
    providers: normalizeProviderRows(providerRows),
    raw: data,
  };
}

function normalizeTechnology(value, code) {
  const text = String(value || code || "").toLowerCase();
  if (text.includes("fiber") || text === "50") return "Fiber";
  if (text.includes("cable") || text === "40") return "Cable";
  if (text.includes("fixed wireless") || ["70", "71", "72"].includes(String(code))) return "Fixed Wireless";
  if (text.includes("satellite") || ["60", "61"].includes(String(code))) return "Satellite";
  if (text.includes("dsl") || text === "10") return "DSL";
  return value || "Broadband";
}

function bizResLabel(code) {
  if (code === "R") return "Residential";
  if (code === "B") return "Business";
  if (code === "X") return "Residential & Business";
  return code || "Unknown";
}

function providerKey(row) {
  return [row.provider_id, row.brand_name, row.technology_code, row.bizrescode].filter(Boolean).join("-");
}

export function normalizeProviderRows(rows = []) {
  const seen = new Map();

  for (const row of rows) {
    const technology = normalizeTechnology(row.technology_code_type, row.technology_code);
    const name = row.brand_name || row.provider_name || row.holding_company_name || "Unknown Provider";
    const key = providerKey(row) || `${name}-${technology}`;

    const normalized = {
      id: key,
      providerId: row.provider_id || "",
      provider_id: row.provider_id || "",
      frn: row.frn || "",
      name,
      brand: name,
      brandName: row.brand_name || name,
      providerName: row.provider_name || name,
      company: row.holding_company_name || row.provider_name || name,
      holdingCompany: row.holding_company_name || "",
      technology,
      technologyCode: row.technology_code || "",
      technologyRaw: row.technology_code_type || "",
      download: Number(row.maxdown || 0),
      upload: Number(row.maxup || 0),
      maxdown: Number(row.maxdown || 0),
      maxup: Number(row.maxup || 0),
      lowLatency: Number(row.lowlatency || 0) === 1,
      latency: Number(row.lowlatency || 0) === 1 ? "Low latency" : "Higher latency",
      bizrescode: row.bizrescode || "",
      serviceType: bizResLabel(row.bizrescode),
      residential: row.bizrescode === "R" || row.bizrescode === "X",
      business: row.bizrescode === "B" || row.bizrescode === "X",
      source: "fcc-live",
      provTechFlag: Boolean(row.prov_tech_flag),
      raw: row,
    };

    const existing = seen.get(key);
    if (!existing || normalized.download > existing.download || normalized.upload > existing.upload) {
      seen.set(key, normalized);
    }
  }

  return rankProviders([...seen.values()]);
}

export function scoreProvider(provider) {
  let score = 35;

  if (provider.technology === "Fiber") score += 40;
  else if (provider.technology === "Cable") score += 24;
  else if (provider.technology === "Fixed Wireless") score += 12;
  else if (provider.technology === "DSL") score += 5;
  else if (provider.technology === "Satellite") score += 1;

  if (provider.download >= 5000) score += 12;
  else if (provider.download >= 1000) score += 9;
  else if (provider.download >= 300) score += 5;
  else if (provider.download >= 100) score += 2;

  if (provider.upload >= 1000) score += 8;
  else if (provider.upload >= 100) score += 4;
  else if (provider.upload >= 20) score += 1;

  if (provider.lowLatency) score += 5;
  if (provider.residential) score += 2;

  return Math.min(100, Math.round(score));
}

export function rankProviders(providers = []) {
  return providers
    .map((provider) => ({
      ...provider,
      score: scoreProvider(provider),
      reasons: buildProviderReasons(provider),
    }))
    .sort((a, b) => b.score - a.score || b.download - a.download || b.upload - a.upload || a.name.localeCompare(b.name));
}

function buildProviderReasons(provider) {
  const reasons = [];
  if (provider.technology === "Fiber") reasons.push("Fiber connection");
  if (provider.download >= 1000) reasons.push("Gig-speed capable");
  if (provider.upload >= 1000) reasons.push("Excellent upload performance");
  if (provider.lowLatency) reasons.push("Low latency reported");
  if (provider.serviceType) reasons.push(provider.serviceType);
  return reasons.slice(0, 4);
}

export function summarizeCompetition(providers = []) {
  const summary = {
    total: providers.length,
    fiber: 0,
    cable: 0,
    fixedWireless: 0,
    satellite: 0,
    dsl: 0,
    other: 0,
  };

  for (const provider of providers) {
    if (provider.technology === "Fiber") summary.fiber += 1;
    else if (provider.technology === "Cable") summary.cable += 1;
    else if (provider.technology === "Fixed Wireless") summary.fixedWireless += 1;
    else if (provider.technology === "Satellite") summary.satellite += 1;
    else if (provider.technology === "DSL") summary.dsl += 1;
    else summary.other += 1;
  }

  summary.competitionLevel = summary.fiber >= 2 ? "High Fiber Competition" : summary.fiber === 1 ? "Fiber Available" : "Limited Fiber Competition";
  return summary;
}

export async function lookupLiveFccProviders(address, options = {}) {
  const addressResult = await searchFabricAddress(address, options);
  const selectedLocation = addressResult.bestLocation;

  if (!selectedLocation?.location_id) {
    throw new Error("FCC did not return a usable location_id for this address.");
  }

  const detailResult = await getFabricProviderDetail(selectedLocation.location_id, {
    fabricId: addressResult.fabricId,
    fabricVintage: options.fabricVintage,
  });

  const providers = rankProviders(detailResult.providers || []);

  return {
    ok: true,
    success: true,
    source: "fcc-live-fabric",
    message: providers.length
      ? "Live FCC provider data returned."
      : "FCC location found, but no provider rows were returned.",
    address,
    fabricId: addressResult.fabricId,
    fabricVintage: detailResult.fabricVintage,
    locationId: selectedLocation.location_id,
    location_id: selectedLocation.location_id,
    location: {
      ...selectedLocation,
      ...(detailResult.location || {}),
    },
    addressCandidates: addressResult.candidates,
    providerCount: providers.length,
    providers,
    recommendedProvider: providers[0] || null,
    competition: summarizeCompetition(providers),
    lookupTimestamp: new Date().toISOString(),
  };
}
