import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DB_PATH = path.resolve(process.cwd(), "data", "fcc-bdc.sqlite");
let activeDb = null;
let activePath = "";

function text(value) { return String(value ?? "").trim(); }
export function normalizeAddressKey(value) {
  return text(value)
    .toUpperCase()
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bHIGHWAY\b/g, "HWY")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/[^A-Z0-9]/g, "");
}

function resolveDbPath() {
  return path.resolve(process.env.FCC_BDC_DB_PATH || DEFAULT_DB_PATH);
}

function openDb() {
  const dbPath = resolveDbPath();
  if (activeDb && activePath === dbPath) return activeDb;
  if (!fs.existsSync(dbPath)) return null;
  activeDb?.close?.();
  activeDb = new DatabaseSync(dbPath, { readOnly: true });
  activePath = dbPath;
  return activeDb;
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

function mapProvider(row) {
  return {
    id: text(row.provider_id || row.frn || row.brand_name),
    providerId: text(row.provider_id),
    frn: text(row.frn),
    name: text(row.brand_name || row.provider_name),
    displayName: text(row.brand_name || row.provider_name),
    providerName: text(row.provider_name),
    brandName: text(row.brand_name),
    technology: normalizeTechnology(row.technology),
    technologyCode: text(row.technology_code),
    download: Number(row.max_download || 0),
    upload: Number(row.max_upload || 0),
    lowLatency: Boolean(row.low_latency),
    residential: Boolean(row.residential),
    business: Boolean(row.business),
    source: "fcc-bdc-download",
    verified: true,
    datasetVersion: text(row.dataset_version),
    asOfDate: text(row.as_of_date),
    locationId: text(row.location_id),
  };
}

export function lookupBdcByAddress(address) {
  const db = openDb();
  if (!db) return { status: "database_missing", providers: [], dataset: null };
  const key = normalizeAddressKey(address);
  if (!key) return { status: "address_not_matched", providers: [], dataset: getBdcStatus() };
  const rows = db.prepare(`
    SELECT a.location_id, a.provider_id, a.frn, a.provider_name, a.brand_name,
           a.technology, a.technology_code, a.max_download, a.max_upload,
           a.low_latency, a.residential, a.business, d.version AS dataset_version,
           d.as_of_date
      FROM locations l
      JOIN availability a ON a.location_id = l.location_id
      LEFT JOIN datasets d ON d.id = a.dataset_id
     WHERE l.normalized_address = ?
     ORDER BY a.max_download DESC, a.max_upload DESC
  `).all(key);
  return {
    status: rows.length ? "verified" : "no_verified_providers",
    providers: rows.map(mapProvider),
    dataset: getBdcStatus(),
  };
}

export function getBdcStatus() {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    return { ready: false, dbPath, reason: "FCC BDC database has not been imported yet." };
  }
  try {
    const db = openDb();
    const dataset = db.prepare("SELECT * FROM datasets ORDER BY imported_at DESC LIMIT 1").get() || null;
    const locations = Number(db.prepare("SELECT COUNT(*) AS count FROM locations").get()?.count || 0);
    const availability = Number(db.prepare("SELECT COUNT(*) AS count FROM availability").get()?.count || 0);
    return { ready: true, dbPath, dataset, locations, availability };
  } catch (error) {
    return { ready: false, dbPath, reason: error.message };
  }
}
