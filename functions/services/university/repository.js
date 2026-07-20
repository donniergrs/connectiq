import { getSeedCatalog } from "./catalog.js";

const catalog = getSeedCatalog();
const providerMap = new Map(catalog.providers.map((item) => [item.id, item]));
const articleMap = new Map(catalog.articles.map((item) => [item.id, item]));

function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export function listProviders({ query = "" } = {}) {
  const needle = normalize(query);
  return [...providerMap.values()].filter((item) => !needle || normalize(`${item.name} ${item.technology.join(" ")} ${item.services.join(" ")}`).includes(needle));
}

export function findProvider(value) {
  const needle = normalize(value);
  if (!needle) return null;
  return [...providerMap.values()].find((item) => {
    const id = normalize(item.id);
    const name = normalize(item.name);
    const primary = name.split(" ")[0];
    return id === needle || name === needle || name.includes(needle) || needle.includes(name) || (primary.length >= 4 && needle.includes(primary));
  }) || null;
}

export function listArticles({ query = "", type = "" } = {}) {
  const needle = normalize(query);
  return [...articleMap.values()].filter((item) => (!type || item.type === type) && (!needle || normalize(`${item.title} ${item.tags.join(" ")} ${item.content.summary}`).includes(needle)));
}

export function upsertProvider(provider) {
  if (!provider?.id || !provider?.name) throw new Error("Provider id and name are required.");
  const normalized = { ...provider, id: String(provider.id).toLowerCase().trim(), updatedAt: new Date().toISOString() };
  providerMap.set(normalized.id, normalized);
  return normalized;
}

export function universityHealth() {
  return { ok: true, service: "connectiq-university", version: "1.0.0", providers: providerMap.size, articles: articleMap.size };
}
