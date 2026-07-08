import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "../data/fccStaticAvailability.json");

const PROVIDER_INTELLIGENCE = {
  "at&t": { installEta: "2-5 days", commission: 175, promo: "Gift card offers may apply", reliability: 94, latencyMs: 6, boost: 8, dsiSupported: true },
  "wow internet, cable & phone": { installEta: "Varies", commission: 0, promo: "Verify current offer", reliability: 90, latencyMs: 8, boost: 4, dsiSupported: false },
  spectrum: { installEta: "1-3 days", commission: 120, promo: "Introductory pricing may apply", reliability: 82, latencyMs: 24, boost: 2, dsiSupported: true },
  verizon: { installEta: "2-4 days", commission: 100, promo: "5G Home offers vary", reliability: 78, latencyMs: 38, boost: 1, dsiSupported: true },
  "t-mobile": { installEta: "1-3 days", commission: 90, promo: "5G Home Internet offers vary", reliability: 72, latencyMs: 45, boost: 1, dsiSupported: true },
  starlink: { installEta: "Varies", commission: 0, promo: "Hardware required", reliability: 70, latencyMs: 55, boost: -8, dsiSupported: false },
  hughesnet: { installEta: "Varies", commission: 0, promo: "Satellite plans vary", reliability: 60, latencyMs: 620, boost: -10, dsiSupported: false },
  "viasat inc": { installEta: "Varies", commission: 0, promo: "Satellite plans vary", reliability: 58, latencyMs: 640, boost: -10, dsiSupported: false },
};

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\b(lane)\b/g, "ln")
    .replace(/\b(street)\b/g, "st")
    .replace(/\b(road)\b/g, "rd")
    .replace(/\b(avenue)\b/g, "ave")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function zipFromText(value = "") {
  return String(value).match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5) || "";
}

function stateFromText(value = "") {
  return String(value).toUpperCase().match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY|DC)\b/)?.[1] || "";
}

function slugify(value = "provider") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function technologyScore(technology = "") {
  const tech = String(technology).toLowerCase();
  if (tech.includes("fiber")) return 45;
  if (tech.includes("cable")) return 30;
  if (tech.includes("fixed wireless")) return 18;
  if (tech.includes("dsl")) return 8;
  if (tech.includes("satellite")) return 2;
  return 10;
}

function getProviderIntel(name = "") {
  const providerName = String(name).toLowerCase();
  return Object.entries(PROVIDER_INTELLIGENCE).find(([key]) => providerName.includes(key))?.[1] || {
    installEta: "Verify with carrier",
    commission: 100,
    promo: "Verify current offer",
    reliability: 70,
    latencyMs: 35,
    boost: 0,
    dsiSupported: false,
  };
}

function scoreProvider(provider) {
  const intel = getProviderIntel(provider.name);
  let score = 30;
  score += technologyScore(provider.technology);
  if (Number(provider.download) >= 1000) score += 10;
  if (Number(provider.upload) >= 1000) score += 10;
  if (provider.lowLatency) score += 6;
  if (intel.dsiSupported) score += 8;
  score += intel.boost || 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildReasons(provider) {
  const reasons = [];
  if (provider.technology === "Fiber") reasons.push("Fiber gives the strongest speed, upload, and latency profile.");
  if (Number(provider.download) >= 1000) reasons.push("Gig-capable download speeds available.");
  if (Number(provider.upload) >= 1000) reasons.push("Symmetrical or near-symmetrical upload performance.");
  if (provider.lowLatency) reasons.push("FCC data indicates low-latency service.");
  if (provider.dsiSupported) reasons.push("Provider is marked as DSI-supported in ConnectIQ.");
  if (!reasons.length) reasons.push("Provider appears in the static FCC availability dataset for this location.");
  return reasons.slice(0, 5);
}

function loadDataset() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (error) {
    return { version: "missing", locations: [], error: error.message };
  }
}

function matchLocation(address, locations = []) {
  const wanted = normalize(address);
  const wantedZip = zipFromText(address);
  const wantedState = stateFromText(address);

  const ranked = locations.map((location, index) => {
    const full = normalize(location.fullAddress || `${location.addressPrimary || ""} ${location.city || ""} ${location.state || ""} ${location.zip || ""}`);
    let score = 0;
    if (wantedZip && String(location.zip) === wantedZip) score += 40;
    if (wantedState && String(location.state).toUpperCase() === wantedState) score += 25;
    if (full && wanted && (full.includes(wanted) || wanted.includes(full))) score += 50;
    const street = normalize(location.addressPrimary || "");
    if (street && wanted.includes(street)) score += 45;
    const city = normalize(location.city || "");
    if (city && wanted.includes(city)) score += 20;
    return { location, score, index };
  }).filter((item) => item.score >= 80);

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked[0]?.location || null;
}

function normalizeProvider(provider, index = 0) {
  const intel = getProviderIntel(provider.name);
  const normalized = {
    id: String(provider.providerId || provider.frn || `${slugify(provider.name)}-${index}`),
    providerId: provider.providerId || "",
    frn: provider.frn || "",
    name: provider.name || provider.brandName || provider.providerName || `Provider ${index + 1}`,
    providerName: provider.providerName || provider.name || "",
    holdingCompany: provider.holdingCompany || "",
    technology: provider.technology || provider.technologyType || "Broadband",
    technologyType: provider.technologyType || provider.technology || "Broadband",
    download: Number(provider.download || 0),
    upload: Number(provider.upload || 0),
    lowLatency: Boolean(provider.lowLatency),
    residential: Boolean(provider.residential),
    business: Boolean(provider.business),
    source: "fcc-static-database",
    installEta: intel.installEta,
    commission: intel.commission,
    promo: intel.promo,
    reliability: intel.reliability,
    latencyMs: intel.latencyMs,
    dsiSupported: intel.dsiSupported,
  };

  normalized.score = scoreProvider(normalized);
  normalized.connectIqRecommendation = normalized.score >= 92 ? "Best Overall" : normalized.technology === "Fiber" ? "Best Fiber Option" : normalized.score >= 80 ? "Strong Choice" : "Available Option";
  normalized.reasons = buildReasons(normalized);
  return normalized;
}

function summarize(providers) {
  return {
    total: providers.length,
    fiber: providers.filter((p) => p.technology === "Fiber").length,
    cable: providers.filter((p) => p.technology === "Cable").length,
    fixedWireless: providers.filter((p) => p.technology === "Fixed Wireless").length,
    satellite: providers.filter((p) => p.technology === "Satellite").length,
    dsiSupported: providers.filter((p) => p.dsiSupported).length,
  };
}

export function getStaticFccStatus() {
  const dataset = loadDataset();
  return {
    ok: !dataset.error,
    version: dataset.version || "unknown",
    updatedAt: dataset.updatedAt || "unknown",
    locationCount: dataset.locations?.length || 0,
    providerRows: (dataset.locations || []).reduce((sum, location) => sum + (location.providers?.length || 0), 0),
    error: dataset.error || null,
  };
}

export function lookupStaticFccAvailability(address = "") {
  const dataset = loadDataset();
  const location = matchLocation(address, dataset.locations || []);

  if (!location) {
    return {
      ok: false,
      source: "fcc-static-database",
      message: "No matching location found in the local FCC static database.",
      status: getStaticFccStatus(),
    };
  }

  const providers = (location.providers || [])
    .map(normalizeProvider)
    .sort((a, b) => b.score - a.score || b.download - a.download || b.upload - a.upload);

  return {
    ok: true,
    source: "fcc-static-database",
    message: "Provider recommendations returned from ConnectIQ static FCC database.",
    address,
    location: {
      locationId: location.locationId,
      addressPrimary: location.addressPrimary,
      city: location.city,
      state: location.state,
      zip: location.zip,
      fullAddress: location.fullAddress,
      coordinates: location.coordinates || null,
    },
    geocode: {
      matchedAddress: location.fullAddress,
      latitude: location.coordinates?.[1] || null,
      longitude: location.coordinates?.[0] || null,
    },
    providerCount: providers.length,
    providers,
    recommendation: providers[0] || null,
    competition: summarize(providers),
    notes: [
      `Matched local FCC static location ${location.locationId || location.fullAddress}.`,
      `Returned ${providers.length} provider recommendations from local FCC static dataset.`,
      "This avoids relying on the FCC browser-only website endpoint.",
    ],
  };
}
