function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value) {
  return String(value ?? "").trim();
}

export function normalizeProvider(provider = {}, source = "unknown") {
  const providerId = text(provider.providerId || provider.provider_id || provider.id || provider.frn);
  const name = text(
    provider.displayName || provider.brandName || provider.brand_name || provider.providerName || provider.provider_name || provider.name,
  );
  const technology = text(
    provider.technology || provider.technologyType || provider.technology_code_type || provider.technologyCodeType,
  ) || "Broadband";

  return {
    ...provider,
    providerId,
    id: providerId || text(provider.id) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    displayName: name,
    technology,
    download: number(provider.download ?? provider.maxdown ?? provider.maxDownload),
    upload: number(provider.upload ?? provider.maxup ?? provider.maxUpload),
    lowLatency: Boolean(provider.lowLatency ?? provider.lowlatency),
    source: text(provider.source || source) || "unknown",
    verified: provider.verified === true || ["fcc", "fcc-bdc", "carrier-api", "dsi"].includes(text(provider.source || source).toLowerCase()),
  };
}

export function normalizeProviderList(providers = [], source = "unknown") {
  const seen = new Set();
  return (Array.isArray(providers) ? providers : [])
    .map((provider) => normalizeProvider(provider, source))
    .filter((provider) => provider.name)
    .filter((provider) => {
      const key = `${provider.providerId || provider.name.toLowerCase()}|${provider.technology.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
