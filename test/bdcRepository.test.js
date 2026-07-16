import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "connectiq-bdc-"));
const dbPath = path.join(tempDir, "fcc-bdc.sqlite");
process.env.FCC_BDC_DB_PATH = dbPath;

const db = new DatabaseSync(dbPath);
db.exec(`
CREATE TABLE datasets (id INTEGER PRIMARY KEY, version TEXT, as_of_date TEXT, imported_at TEXT, locations_file TEXT, availability_file TEXT);
CREATE TABLE locations (location_id TEXT PRIMARY KEY, normalized_address TEXT NOT NULL, address TEXT, city TEXT, state TEXT, zip TEXT, latitude REAL, longitude REAL);
CREATE TABLE availability (id INTEGER PRIMARY KEY AUTOINCREMENT, dataset_id INTEGER, location_id TEXT NOT NULL, provider_id TEXT, frn TEXT, provider_name TEXT, brand_name TEXT, technology TEXT, technology_code TEXT, max_download REAL, max_upload REAL, low_latency INTEGER, residential INTEGER, business INTEGER);
INSERT INTO datasets VALUES (1,'2026-06','2026-06-30','2026-07-15','locations.csv','availability.csv');
INSERT INTO locations VALUES ('1001','1935FORTPRINCEBLVDWELLFORDSC293859750','1935 FORT PRINCE BLVD','WELLFORD','SC','29385-9750',34.9,-82.1);
INSERT INTO availability(dataset_id,location_id,provider_id,frn,provider_name,brand_name,technology,technology_code,max_download,max_upload,low_latency,residential,business)
VALUES (1,'1001','77','001','Example Holdings','Example Fiber','Fiber to the Premises','50',5000,5000,1,1,0);
`);
db.close();

const { getBdcStatus, lookupBdcByAddress, normalizeAddressKey } = await import("../functions/services/bdcRepository.js");

test("normalizes common street suffixes for exact BDC matching", () => {
  assert.equal(normalizeAddressKey("1935 Fort Prince Boulevard, Wellford SC 29385-9750"), "1935FORTPRINCEBLVDWELLFORDSC293859750");
});

test("returns only providers stored for the matched BDC location", () => {
  const result = lookupBdcByAddress("1935 Fort Prince Blvd Wellford SC 29385-9750");
  assert.equal(result.status, "verified");
  assert.equal(result.providers.length, 1);
  assert.equal(result.providers[0].displayName, "Example Fiber");
  assert.equal(result.providers[0].source, "fcc-bdc-download");
});

test("empty BDC address match remains empty", () => {
  const result = lookupBdcByAddress("1 Missing Road Nowhere SC 00000");
  assert.equal(result.status, "no_verified_providers");
  assert.deepEqual(result.providers, []);
});

test("reports the active BDC dataset version", () => {
  const status = getBdcStatus();
  assert.equal(status.ready, true);
  assert.equal(status.dataset.version, "2026-06");
});
