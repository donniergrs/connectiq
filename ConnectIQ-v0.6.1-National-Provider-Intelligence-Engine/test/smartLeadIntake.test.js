import test from "node:test";
import assert from "node:assert/strict";
import {
  advisorReadiness,
  dataCompletenessScore,
  detectColumnMappings,
  excludeCurrentCarrier,
  identityKeys,
  mergeLeadData,
  normalizeLeadRow,
  parseCsv,
  readinessScore,
  validateLead,
} from "../src/services/smartLeadIntake.js";

test("parses quoted CSV rows", () => {
  const parsed = parseCsv('Customer,Email,Address\n"Smith, John",john@example.com,"123 Main St, Greenville, SC 29601"');
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].Customer, "Smith, John");
});

test("recognizes flexible aliases across all standard lead fields", () => {
  const row = {
    "Given Name": "John",
    Surname: "Smith",
    "Email Address": "john@example.com",
    "Contact Number": "864-555-1212",
    "Physical Address": "123 Main St, Greenville, SC 29601",
    "Current ISP": "Spectrum",
    Remarks: "Interested",
    "Marketing Campaign": "July",
    Origin: "Purchased List",
    Supplier: "Vendor A",
    CPL: "1.25",
    "Lead Date": "2026-07-14",
  };
  const mappings = detectColumnMappings(Object.keys(row), [row]);
  const bySource = Object.fromEntries(mappings.map((item) => [item.source, item.field]));
  assert.equal(bySource["Given Name"], "firstName");
  assert.equal(bySource.Surname, "lastName");
  assert.equal(bySource["Email Address"], "email");
  assert.equal(bySource["Contact Number"], "phone");
  assert.equal(bySource["Physical Address"], "address");
  assert.equal(bySource["Current ISP"], "currentCarrier");
  assert.equal(bySource.Remarks, "notes");
  assert.equal(bySource["Marketing Campaign"], "campaign");
  assert.equal(bySource.Origin, "leadSource");
  assert.equal(bySource.Supplier, "vendor");
  assert.equal(bySource.CPL, "costPerLead");
  assert.equal(bySource["Lead Date"], "purchaseDate");
});

test("maps Account Name to full name and Physical Address to address", () => {
  const rows = [{ "Account Name": "John Smith", "Physical Address": "123 Main St, Greenville, SC 29601" }];
  const mappings = detectColumnMappings(Object.keys(rows[0]), rows);
  assert.equal(mappings.find((item) => item.source === "Account Name").field, "fullName");
  assert.equal(mappings.find((item) => item.source === "Physical Address").field, "address");
});

test("learned header mappings override unknown headers", () => {
  const rows = [{ "Special Customer Label": "Jane Doe" }];
  const mappings = detectColumnMappings(Object.keys(rows[0]), rows, {
    __headerToField: { specialcustomerlabel: "fullName" },
  });
  assert.equal(mappings[0].field, "fullName");
  assert.equal(mappings[0].reason, "learned mapping");
});

test("does not automatically map two source columns to the same field", () => {
  const rows = [{ Phone: "8645551212", Mobile: "8645553434" }];
  const mappings = detectColumnMappings(Object.keys(rows[0]), rows);
  assert.equal(mappings.filter((item) => item.field === "phone").length, 1);
  assert.equal(mappings.filter((item) => item.field === "unmapped").length, 1);
});

test("normalizes a comma-form name and combined service address", () => {
  const row = { "Account Name": "Smith, John", "Physical Address": "123 Main St, Greenville, SC 29601", Phone: "(864) 555-1212" };
  const mappings = [
    { source: "Account Name", field: "fullName" },
    { source: "Physical Address", field: "address" },
    { source: "Phone", field: "phone" },
  ];
  const lead = normalizeLeadRow(row, mappings);
  assert.equal(lead.name, "John Smith");
  assert.equal(lead.city, "Greenville");
  assert.equal(lead.state, "SC");
  assert.equal(lead.zip, "29601");
  assert.equal(lead.phone, "8645551212");
});

test("parses a combined address without commas", () => {
  const row = { Address: "123 Main St Greenville SC 29601" };
  const lead = normalizeLeadRow(row, [{ source: "Address", field: "address" }]);
  assert.equal(lead.address, "123 Main St");
  assert.equal(lead.city, "Greenville");
  assert.equal(lead.state, "SC");
  assert.equal(lead.zip, "29601");
});

test("imports address-only leads and classifies them for contact research", () => {
  const lead = { address: "123 Main St", city: "Greenville", state: "SC", zip: "29601" };
  const result = validateLead(lead);
  assert.equal(result.valid, true);
  assert.equal(result.readiness, "needs_contact_research");
  assert.equal(advisorReadiness(lead), "needs_contact_research");
});

test("allows incomplete FCC address while warning that enrichment is pending", () => {
  const result = validateLead({ address: "123 Main St" });
  assert.equal(result.valid, true);
  assert.match(result.warnings.join(" "), /FCC enrichment is pending/);
});

test("rejects only rows without a usable address", () => {
  assert.equal(validateLead({ phone: "8645551212" }).valid, false);
  assert.equal(validateLead({ email: "john@example.com" }).valid, false);
});

test("preserves unknown non-empty source columns", () => {
  const row = { Address: "123 Main St", "Custom Vendor Flag": "VIP" };
  const mappings = [
    { source: "Address", field: "address" },
    { source: "Custom Vendor Flag", field: "unmapped" },
  ];
  const lead = normalizeLeadRow(row, mappings);
  assert.equal(lead.unmappedFields["Custom Vendor Flag"], "VIP");
});

test("creates identity keys for address phone and email", () => {
  const keys = identityKeys({ address: "123 Main Street", city: "Greenville", state: "SC", zip: "29601", phone: "864-555-1212", email: "John@Example.com" });
  assert.equal(keys.length, 3);
  assert.ok(keys.some((key) => key.startsWith("address:")));
  assert.ok(keys.includes("phone:8645551212"));
  assert.ok(keys.includes("email:john@example.com"));
});

test("merges missing contact data into an existing address record", () => {
  const merged = mergeLeadData(
    { address: "123 Main St", city: "Greenville", state: "SC", zip: "29601", name: "John Smith" },
    { address: "123 Main St", city: "Greenville", state: "SC", zip: "29601", phone: "8645551212", email: "john@example.com" },
  );
  assert.equal(merged.phone, "8645551212");
  assert.equal(merged.email, "john@example.com");
  assert.equal(merged.name, "John Smith");
});

test("data completeness and advisor readiness are separate", () => {
  const addressOnly = { address: "123 Main St", city: "Greenville", state: "SC", zip: "29601" };
  const contactable = { ...addressOnly, phone: "8645551212" };
  assert.ok(dataCompletenessScore(contactable) > dataCompletenessScore(addressOnly));
  assert.equal(advisorReadiness(contactable), "ready_to_call");
});

test("excludes the customer's current carrier from recommendations", () => {
  const providers = [{ displayName: "Spectrum" }, { displayName: "AT&T Fiber" }];
  assert.deepEqual(excludeCurrentCarrier(providers, "Spectrum").map((item) => item.displayName), ["AT&T Fiber"]);
});

test("readiness increases as enrichment completes", () => {
  const lead = { name: "John Smith", phone: "8645551212", email: "john@example.com", address: "123 Main", city: "Greenville", state: "SC", zip: "29601" };
  const score = readinessScore(lead, { fccComplete: true, recommendation: { displayName: "AT&T" }, quote: {}, assignedAdvisor: { name: "Sarah" } });
  assert.equal(score, 100);
});
