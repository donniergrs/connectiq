export function normalize(value = "") {
  return String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

export function canonicalProvider(value = "") {
  const n = normalize(value).replace(/\s+/g, "");
  const aliases = {
    att: "at&t", atandt: "at&t", bellsouth: "at&t",
    comcast: "xfinity", xfinity: "xfinity",
    charter: "spectrum", spectrum: "spectrum",
    tmobile: "t-mobile", tmhi: "t-mobile",
    verizonfios: "verizon fios", fios: "verizon fios",
    centurylink: "quantum fiber", quantum: "quantum fiber",
    googlefiber: "google fiber", frontiercommunications: "frontier",
  };
  return aliases[n] || normalize(value);
}
