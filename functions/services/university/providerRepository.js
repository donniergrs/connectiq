import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalProvider } from "./normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const providerPath = path.resolve(__dirname, "../../knowledge/providers/provider-encyclopedia.json");
let cache = null;

function load() {
  if (!cache) cache = JSON.parse(fs.readFileSync(providerPath, "utf8"));
  return cache;
}

export function listProviderProfiles() { return load().providers; }

export function findProviderProfile(name) {
  const wanted = canonicalProvider(name);
  return load().providers.find((p) => {
    const candidates = [p.name, ...(p.aliases || [])].map(canonicalProvider);
    return candidates.includes(wanted);
  }) || null;
}

export function matchProviderFromMessage(message = "", providers = []) {
  const text = canonicalProvider(message);
  const known = [...providers.map((p) => p.displayName || p.brand_name || p.name).filter(Boolean), ...listProviderProfiles().map((p) => p.name)];
  return known.find((name) => text.includes(canonicalProvider(name))) || null;
}
