export function normalizeText(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalProvider(value = "") {
  const text = normalizeText(value);
  const aliases = [
    [/at\s*&\s*t|att/i, "AT&T"],
    [/spectrum|charter/i, "Spectrum"],
    [/xfinity|comcast/i, "Xfinity"],
    [/verizon|fios/i, "Verizon"],
    [/t-?mobile/i, "T-Mobile"],
    [/frontier/i, "Frontier"],
    [/cox/i, "Cox"],
    [/centurylink|quantum/i, "Quantum Fiber"],
    [/google fiber|gfiber/i, "Google Fiber"],
    [/lumos/i, "Lumos"],
    [/windstream|kinetic/i, "Kinetic"],
    [/hughesnet/i, "HughesNet"],
    [/viasat/i, "Viasat"],
    [/starlink/i, "Starlink"],
  ];
  for (const [pattern, canonical] of aliases) {
    if (pattern.test(text)) return canonical;
  }
  return text;
}

export function parseMoney(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function parseSpeed(raw, unit = "mbps") {
  const value = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return /gb|gig/i.test(unit) ? Math.round(value * 1000) : Math.round(value);
}

export function unique(values = []) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}
