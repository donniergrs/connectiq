export const FIELD_ALIASES = {
  firstName: [
    "firstname", "first", "fname", "givenname", "contactfirst", "customerfirstname",
    "accountfirstname", "subscriberfirstname", "ownerfirstname",
  ],
  lastName: [
    "lastname", "last", "lname", "surname", "familyname", "contactlast", "customerlastname",
    "accountlastname", "subscriberlastname", "ownerlastname",
  ],
  fullName: [
    "name", "fullname", "customer", "customername", "contact", "contactname", "prospectname",
    "accountname", "account", "accountholder", "acctname", "acctholder", "subscriber", "resident",
    "homeowner", "primarycontact", "billingname", "servicename", "ownername",
  ],
  email: [
    "email", "emailaddress", "primaryemail", "contactemail", "customeremail", "emailaddr",
    "accountemail", "subscriberemail", "owneremail",
  ],
  phone: [
    "phone", "phonenumber", "mobile", "mobilenumber", "cell", "cellphone", "telephone",
    "contactnumber", "primaryphone", "contactphone", "customerphone", "homephone", "wirelessphone",
    "accountphone", "subscriberphone", "ownerphone",
  ],
  address: [
    "address", "physicaladdress", "street", "streetaddress", "serviceaddress", "propertyaddress",
    "address1", "addressline1", "location", "servicelocation", "siteaddress", "installaddress",
    "installationaddress", "residenceaddress", "homeaddress", "customeraddress", "premiseaddress",
    "premisesaddress", "accountaddress", "billingaddress", "mailingaddress",
  ],
  city: ["city", "town", "municipality", "servicecity", "propertycity", "physicalcity", "accountcity"],
  state: ["state", "province", "region", "st", "servicestate", "propertystate", "physicalstate", "accountstate"],
  zip: [
    "zip", "zipcode", "postal", "postalcode", "postcode", "zip5", "servicezip", "servicezipcode",
    "propertyzip", "physicalzip", "accountzip",
  ],
  currentCarrier: [
    "currentcarrier", "currentprovider", "existingcarrier", "existingprovider", "isp", "internetprovider",
    "currentisp", "incumbentprovider", "currentinternetprovider", "serviceprovider", "provider",
  ],
  notes: ["notes", "note", "comments", "comment", "description", "details", "info", "remarks", "additionalinfo"],
  campaign: ["campaign", "campaignname", "marketingcampaign", "listname", "campaignid"],
  leadSource: ["leadsource", "source", "origin", "channel", "acquisitionsource", "marketingchannel"],
  vendor: ["vendor", "listvendor", "providerofleads", "leadvendor", "supplier", "listprovider"],
  costPerLead: ["costperlead", "cpl", "leadcost", "cost", "unitcost", "costperrecord"],
  purchaseDate: [
    "purchasedate", "acquisitiondate", "dateacquired", "datepurchased", "leaddate", "listpurchasedate",
  ],
};

export function normalizeHeader(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function headerTokens(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function splitCsvLine(line, delimiter = ",") {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseCsv(text = "") {
  const normalized = String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const delimiter = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? "\t" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map((header, index) => header || `Column ${index + 1}`);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function looksLikePhone(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function looksLikeZip(value) {
  return /^\d{5}(?:-\d{4})?$/.test(String(value).trim());
}

function looksLikeState(value) {
  return /^[A-Za-z]{2}$/.test(String(value).trim());
}

function looksLikeAddress(value) {
  return /^\s*\d+[A-Za-z0-9-]*\s+.+/.test(String(value));
}

function inferField(values = []) {
  const samples = values.map((value) => String(value ?? "").trim()).filter(Boolean).slice(0, 30);
  if (!samples.length) return { field: "unmapped", confidence: 0 };
  const ratio = (matcher) => samples.filter(matcher).length / samples.length;
  const candidates = [
    ["email", ratio(looksLikeEmail)],
    ["phone", ratio(looksLikePhone)],
    ["zip", ratio(looksLikeZip)],
    ["state", ratio(looksLikeState)],
    ["address", ratio(looksLikeAddress)],
  ].sort((a, b) => b[1] - a[1]);
  if (candidates[0][1] >= 0.72) {
    return { field: candidates[0][0], confidence: Math.max(70, Math.round(candidates[0][1] * 90)) };
  }
  return { field: "unmapped", confidence: 0 };
}

function aliasCandidates(header, customAliases = {}) {
  const normalized = normalizeHeader(header);
  const tokens = new Set(headerTokens(header));
  const combinedAliases = {};
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    combinedAliases[field] = [...aliases, ...(customAliases[field] || []).map(normalizeHeader)];
  });

  const exact = [];
  const similar = [];
  Object.entries(combinedAliases).forEach(([field, aliases]) => {
    if (aliases.includes(normalized)) exact.push({ field, confidence: 99, reason: "header" });
    aliases.forEach((alias) => {
      if (!alias || normalized === alias) return;
      const aliasTokenSet = new Set(headerTokens(alias));
      const common = [...tokens].filter((token) => aliasTokenSet.has(token)).length;
      const maxTokenCount = Math.max(tokens.size, aliasTokenSet.size, 1);
      const tokenScore = common / maxTokenCount;
      const containsScore = normalized.length >= 5 && alias.length >= 5 && (normalized.includes(alias) || alias.includes(normalized)) ? 0.84 : 0;
      const score = Math.max(tokenScore, containsScore);
      if (score >= 0.8) similar.push({ field, confidence: Math.round(score * 92), reason: "header similarity" });
    });
  });
  return exact.length ? exact : similar.sort((a, b) => b.confidence - a.confidence);
}

export function detectColumnMappings(headers = [], rows = [], customAliases = {}) {
  const provisional = headers.map((header, sourceIndex) => {
    const learnedField = customAliases?.__headerToField?.[normalizeHeader(header)];
    if (learnedField) {
      return { source: header, sourceIndex, field: learnedField, confidence: 100, reason: "learned mapping" };
    }
    const candidates = aliasCandidates(header, customAliases);
    if (candidates.length) return { source: header, sourceIndex, ...candidates[0] };
    const inferred = inferField(rows.map((row) => row[header]));
    return { source: header, sourceIndex, ...inferred, reason: inferred.field === "unmapped" ? "review" : "value pattern" };
  });

  // A single CSV column must never populate multiple ConnectIQ fields, and one destination field
  // should not be silently assigned from multiple columns. Keep the strongest automatic match.
  const winners = new Map();
  provisional.forEach((mapping) => {
    if (mapping.field === "unmapped") return;
    const current = winners.get(mapping.field);
    if (!current || mapping.confidence > current.confidence) winners.set(mapping.field, mapping);
  });

  return provisional.map((mapping) => {
    if (mapping.field === "unmapped") return mapping;
    const winner = winners.get(mapping.field);
    if (winner?.source !== mapping.source) {
      return { ...mapping, field: "unmapped", confidence: 0, reason: `review: ${mapping.field} already mapped from ${winner.source}` };
    }
    return mapping;
  });
}

function titleCase(value = "") {
  return String(value).trim().toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function splitFullName(fullName = "") {
  let raw = String(fullName).trim();
  if (!raw) return { firstName: "", lastName: "" };
  if (raw.includes(",")) {
    const [last, ...firstParts] = raw.split(",").map((part) => part.trim()).filter(Boolean);
    raw = [...firstParts, last].join(" ");
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: titleCase(parts[0]), lastName: "" };
  return { firstName: titleCase(parts[0]), lastName: titleCase(parts.slice(1).join(" ")) };
}

export function parseFullAddress(value = "") {
  const raw = String(value).trim();
  if (!raw) return { address: "", city: "", state: "", zip: "" };
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 1].match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZip) {
      return {
        address: parts.slice(0, -2).join(", "),
        city: parts[parts.length - 2],
        state: stateZip[1].toUpperCase(),
        zip: stateZip[2],
      };
    }
  }
  const stateZip = raw.match(/^(.*)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (stateZip) {
    const beforeState = stateZip[1].trim();
    const streetCity = beforeState.match(/^(.*?\b(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|ct|court|blvd|boulevard|hwy|highway|way|pkwy|parkway|pl|place|cir|circle|trl|trail)\b\.?)(?:\s+)(.+)$/i);
    if (streetCity && looksLikeAddress(streetCity[1])) {
      return { address: streetCity[1].trim(), city: streetCity[2].trim(), state: stateZip[2].toUpperCase(), zip: stateZip[3] };
    }
  }
  return { address: raw, city: "", state: "", zip: "" };
}

export function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function normalizeAddressIdentity(lead = {}) {
  return [lead.address, lead.city, lead.state, lead.zip]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\blane\b/g, "ln")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeLeadRow(row = {}, mappings = [], defaults = {}) {
  const mapped = {};
  const unmappedFields = {};
  mappings.forEach(({ source, field }) => {
    const value = String(row[source] ?? "").trim();
    if (!value) return;
    if (field && field !== "unmapped") mapped[field] = value;
    else unmappedFields[source] = value;
  });
  if ((!mapped.firstName || !mapped.lastName) && mapped.fullName) Object.assign(mapped, splitFullName(mapped.fullName));
  if (mapped.address && (!mapped.city || !mapped.state || !mapped.zip)) {
    const parsed = parseFullAddress(mapped.address);
    mapped.address = parsed.address || mapped.address;
    mapped.city ||= parsed.city;
    mapped.state ||= parsed.state;
    mapped.zip ||= parsed.zip;
  }
  mapped.firstName = titleCase(mapped.firstName);
  mapped.lastName = titleCase(mapped.lastName);
  mapped.name = [mapped.firstName, mapped.lastName].filter(Boolean).join(" ") || titleCase(mapped.fullName || "Unknown Lead");
  mapped.email = String(mapped.email || "").trim().toLowerCase();
  mapped.phone = normalizePhone(mapped.phone);
  mapped.state = String(mapped.state || "").trim().toUpperCase();
  mapped.zip = String(mapped.zip || "").trim();
  mapped.fullAddress = [mapped.address, mapped.city, mapped.state, mapped.zip].filter(Boolean).join(", ");
  mapped.currentCarrier = titleCase(mapped.currentCarrier || "");
  return { ...mapped, unmappedFields, ...defaults };
}

export function hasCompleteFccAddress(lead = {}) {
  return Boolean(lead.address && lead.city && lead.state && lead.zip);
}

export function advisorReadiness(lead = {}) {
  if (lead.phone) return "ready_to_call";
  if (lead.email) return "ready_to_email";
  return "needs_contact_research";
}

export function dataCompletenessScore(lead = {}) {
  let score = 0;
  if (lead.address) score += 35;
  if (lead.city) score += 10;
  if (lead.state) score += 10;
  if (lead.zip) score += 10;
  if (lead.name && lead.name !== "Unknown Lead") score += 10;
  if (lead.phone) score += 15;
  if (lead.email) score += 10;
  return Math.min(100, score);
}

export function validateLead(lead = {}) {
  const errors = [];
  const warnings = [];
  if (!lead.address) errors.push("A usable street, physical, property, or service address is required.");
  if (lead.address && !hasCompleteFccAddress(lead)) warnings.push("Lead will import, but FCC enrichment is pending until city, state, and ZIP are available.");
  if (!lead.phone && !lead.email) warnings.push("Lead will import as Needs Contact Research because no phone or email is available.");
  if (lead.email && !looksLikeEmail(lead.email)) warnings.push("Email format may be invalid.");
  if (lead.phone && !looksLikePhone(lead.phone)) warnings.push("Phone number format may be invalid.");
  return { valid: errors.length === 0, errors, warnings, readiness: advisorReadiness(lead) };
}

export function identityKeys(lead = {}) {
  const keys = [];
  const addressKey = normalizeAddressIdentity(lead);
  if (addressKey) keys.push(`address:${addressKey}`);
  if (lead.phone) keys.push(`phone:${normalizePhone(lead.phone)}`);
  if (lead.email) keys.push(`email:${String(lead.email).trim().toLowerCase()}`);
  return keys;
}

export function duplicateKey(lead = {}) {
  return identityKeys(lead)[0] || "unidentified:";
}

export function mergeLeadData(existing = {}, incoming = {}) {
  const merged = { ...existing };
  const mergeable = [
    "firstName", "lastName", "fullName", "name", "email", "phone", "address", "city", "state", "zip",
    "fullAddress", "currentCarrier", "notes", "campaign", "leadSource", "vendor", "costPerLead", "purchaseDate",
  ];
  mergeable.forEach((field) => {
    if ((!merged[field] || merged[field] === "Unknown Lead") && incoming[field]) merged[field] = incoming[field];
  });
  merged.unmappedFields = { ...(existing.unmappedFields || {}), ...(incoming.unmappedFields || {}) };
  return merged;
}

export function excludeCurrentCarrier(providers = [], currentCarrier = "") {
  const target = normalizeHeader(currentCarrier);
  if (!target) return providers;
  return providers.filter((provider) => {
    const name = normalizeHeader(provider.displayName || provider.name || provider.brandName || provider.brand_name || provider.providerName || provider.provider_name || "");
    return !name.includes(target) && !target.includes(name);
  });
}

export function readinessScore(lead = {}, enrichment = {}) {
  let score = 0;
  if (lead.name && lead.name !== "Unknown Lead") score += 10;
  if (lead.phone) score += 15;
  if (lead.email) score += 10;
  if (lead.address) score += 10;
  if (hasCompleteFccAddress(lead)) score += 15;
  if (enrichment.fccComplete) score += 15;
  if (enrichment.recommendation) score += 15;
  if (enrichment.quote) score += 5;
  if (enrichment.assignedAdvisor) score += 5;
  return Math.min(100, score);
}

export function importHealth(leads = [], results = []) {
  if (!leads.length) return 0;
  const contactable = leads.filter((lead) => lead.phone || lead.email).length;
  const addressPresent = leads.filter((lead) => lead.address).length;
  const completeFccAddress = leads.filter(hasCompleteFccAddress).length;
  const imported = results.filter((result) => ["ready", "needs_enrichment", "merged"].includes(result.status)).length;
  return Math.round(
    ((addressPresent / leads.length) * 30)
    + ((completeFccAddress / leads.length) * 25)
    + ((contactable / leads.length) * 20)
    + ((imported / leads.length) * 25),
  );
}
