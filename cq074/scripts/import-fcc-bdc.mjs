import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";

const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => item.startsWith("--") ? [item.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"] : null).filter(Boolean));
const locationsPath = args.locations ? path.resolve(args.locations) : "";
const availabilityPath = args.availability ? path.resolve(args.availability) : "";
const dbPath = path.resolve(args.db || "functions/data/fcc-bdc.sqlite");
const version = args.version || new Date().toISOString().slice(0, 10);
const asOfDate = args["as-of"] || "";

if (!locationsPath || !availabilityPath) {
  console.error("Usage: node scripts/import-fcc-bdc.mjs --locations <locations.csv> --availability <availability.csv> [--db functions/data/fcc-bdc.sqlite] [--version 2026-06] [--as-of 2026-06-30]");
  process.exit(1);
}
for (const filePath of [locationsPath, availabilityPath]) {
  if (!fs.existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }
}
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  CREATE TABLE datasets (id INTEGER PRIMARY KEY, version TEXT, as_of_date TEXT, imported_at TEXT, locations_file TEXT, availability_file TEXT);
  CREATE TABLE locations (location_id TEXT PRIMARY KEY, normalized_address TEXT NOT NULL, address TEXT, city TEXT, state TEXT, zip TEXT, latitude REAL, longitude REAL);
  CREATE INDEX idx_locations_address ON locations(normalized_address);
  CREATE INDEX idx_locations_zip ON locations(zip);
  CREATE TABLE availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT, dataset_id INTEGER, location_id TEXT NOT NULL,
    provider_id TEXT, frn TEXT, provider_name TEXT, brand_name TEXT,
    technology TEXT, technology_code TEXT, max_download REAL, max_upload REAL,
    low_latency INTEGER, residential INTEGER, business INTEGER
  );
  CREATE INDEX idx_availability_location ON availability(location_id);
  CREATE INDEX idx_availability_provider ON availability(provider_id);
`);
const datasetId = Number(db.prepare("INSERT INTO datasets(version,as_of_date,imported_at,locations_file,availability_file) VALUES(?,?,?,?,?) RETURNING id").get(version, asOfDate, new Date().toISOString(), locationsPath, availabilityPath).id);

function normalizeHeader(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function splitCsvLine(line, delimiter) {
  const values=[]; let value=""; let quoted=false;
  for (let i=0;i<line.length;i+=1) { const ch=line[i]; if(ch==='"'){ if(quoted && line[i+1]==='"'){value+='"';i+=1;} else quoted=!quoted; } else if(ch===delimiter && !quoted){values.push(value);value="";} else value+=ch; }
  values.push(value); return values;
}
function normalizeAddress(value) {
  return String(value || "").toUpperCase().replace(/\bSTREET\b/g,"ST").replace(/\bROAD\b/g,"RD").replace(/\bAVENUE\b/g,"AVE").replace(/\bBOULEVARD\b/g,"BLVD").replace(/\bDRIVE\b/g,"DR").replace(/\bLANE\b/g,"LN").replace(/\bCOURT\b/g,"CT").replace(/\bHIGHWAY\b/g,"HWY").replace(/\bNORTH\b/g,"N").replace(/\bSOUTH\b/g,"S").replace(/\bEAST\b/g,"E").replace(/\bWEST\b/g,"W").replace(/[^A-Z0-9]/g,"");
}
function first(row, aliases) { for (const alias of aliases) if (row[alias] !== undefined && row[alias] !== "") return row[alias]; return ""; }
function bool(value) { return /^(1|true|yes|y|x|r|b)$/i.test(String(value || "")); }
async function importCsv(filePath, handler) {
  const input = fs.createReadStream(filePath); const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let headers=null; let delimiter=","; let count=0;
  for await (const line of rl) {
    if (!headers) { delimiter = line.includes("\t") && !line.includes(",") ? "\t" : ","; headers=splitCsvLine(line,delimiter).map(normalizeHeader); continue; }
    if (!line.trim()) continue;
    const values=splitCsvLine(line,delimiter); const row={}; headers.forEach((header,index)=>{row[header]=values[index] ?? "";});
    handler(row); count+=1; if(count%50000===0) console.log(`${path.basename(filePath)}: ${count.toLocaleString()} rows`);
  }
  return count;
}

const insertLocation = db.prepare("INSERT OR REPLACE INTO locations(location_id,normalized_address,address,city,state,zip,latitude,longitude) VALUES(?,?,?,?,?,?,?,?)");
const insertAvailability = db.prepare("INSERT INTO availability(dataset_id,location_id,provider_id,frn,provider_name,brand_name,technology,technology_code,max_download,max_upload,low_latency,residential,business) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");

db.exec("BEGIN");
const locationCount = await importCsv(locationsPath, (row) => {
  const locationId=first(row,["location_id","bsl_id","fabric_location_id","locationid"]);
  const street=first(row,["address","street_address","service_address","physical_address","primary_address","address_primary"]);
  const city=first(row,["city","municipality"]); const state=first(row,["state","state_abbreviation"]); const zip=first(row,["zip","zip_code","postal_code"]);
  const full=first(row,["full_address","matched_address"]) || [street,city,state,zip].filter(Boolean).join(" ");
  if (!locationId || !full) return;
  insertLocation.run(locationId, normalizeAddress(full), street || full, city, state, zip, Number(first(row,["latitude","lat"])||0)||null, Number(first(row,["longitude","lon","lng"])||0)||null);
});
db.exec("COMMIT");

db.exec("BEGIN");
const availabilityCount = await importCsv(availabilityPath, (row) => {
  const locationId=first(row,["location_id","bsl_id","fabric_location_id","locationid"]); if(!locationId) return;
  const bizres=first(row,["business_residential_code","bizrescode","business_residential"]);
  insertAvailability.run(datasetId, locationId, first(row,["provider_id","providerid"]), first(row,["frn"]), first(row,["provider_name","holding_company_name"]), first(row,["brand_name","brandname","dba_name"]), first(row,["technology_code_type","technology","technology_desc"]), first(row,["technology_code","tech_code"]), Number(first(row,["max_advertised_download_speed","max_download","maxdown"])||0), Number(first(row,["max_advertised_upload_speed","max_upload","maxup"])||0), bool(first(row,["low_latency","lowlatency"]))?1:0, /R|X/i.test(bizres)||bool(row.residential)?1:0, /B|X/i.test(bizres)||bool(row.business)?1:0);
});
db.exec("COMMIT");
db.exec("ANALYZE"); db.close();
console.log(`FCC BDC database created: ${dbPath}`); console.log(`Locations read: ${locationCount.toLocaleString()}`); console.log(`Availability rows read: ${availabilityCount.toLocaleString()}`);
