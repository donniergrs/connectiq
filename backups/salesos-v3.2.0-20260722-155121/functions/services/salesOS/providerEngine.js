const normalize = (value = "") => String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

export function providerName(provider = {}) {
  return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "Provider";
}

export function providerFamily(value = "") {
  let name = normalize(typeof value === "object" ? providerName(value) : value);
  const aliases = [
    [/^(att|attfiber|attinternet|bellsouth)/, "att"],
    [/^(comcast|xfinity)/, "xfinity"],
    [/^(tmobile|tmobilehomeinternet)/, "tmobile"],
    [/^(charter|spectrum)/, "spectrum"],
    [/^(verizon|verizonfios|fios)/, "verizon"],
    [/^(frontier|frontierfiber)/, "frontier"],
    [/^(earthlink|earthlinkfiber)/, "earthlink"],
    [/^(windstream|kinetic)/, "windstream"],
  ];
  for (const [regex, family] of aliases) if (regex.test(name)) return family;
  return name.replace(/(fiber|internet|broadband|communications|telecom|residential|home)$/g, "");
}

export function technology(provider = {}) {
  return String(provider.technology || provider.technologyType || provider.technology_code_type || "Broadband");
}

export function priceOf(provider = {}) {
  const value = Number(provider.price || provider.monthlyPrice || provider.estimatedMonthlyPrice || provider.startingPrice || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function maxDown(provider = {}) {
  const value = Number(provider.maxdown || provider.maxDown || provider.downloadSpeed || provider.maxDownload || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function businessScore(provider = {}) {
  const commission = Number(provider.commission || provider.commissionValue || provider.payout || provider.businessValue || 0);
  if (!commission) return 50;
  return Math.max(0, Math.min(100, commission <= 100 ? commission : commission / 10));
}

function fitScore(provider = {}, memory = {}) {
  const tech = technology(provider).toLowerCase();
  const facts = memory.facts || {};
  const needs = new Set(memory.householdNeeds || []);
  const priorities = new Set([...(memory.preferences || []), ...(memory.painPoints || []), ...(facts.decisionPriorities || []), facts.decisionPriority].filter(Boolean));
  let score = /fiber|fttp/.test(tech) ? 100 : /cable|docsis/.test(tech) ? 78 : /fixed|5g/.test(tech) ? 52 : /dsl/.test(tech) ? 30 : /satellite/.test(tech) ? 10 : 45;
  if ((priorities.has("reliability") || needs.has("workFromHome")) && /fiber|fttp/.test(tech)) score += 22;
  if ((priorities.has("speed") || needs.has("gaming") || needs.has("streaming")) && /fiber|fttp|cable|docsis/.test(tech)) score += 13;
  const price = priceOf(provider);
  if (priorities.has("price") && price) score += price <= 60 ? 18 : price <= 80 ? 10 : 0;
  return score;
}

export function rankProviders(providers = [], memory = {}) {
  const currentFamily = providerFamily(memory.facts?.currentProvider);
  const rejectedFamilies = new Set((memory.rejectedProviders || []).map(providerFamily));
  return providers
    .filter((provider) => {
      const family = providerFamily(provider);
      return family && family !== currentFamily && !rejectedFamilies.has(family);
    })
    .map((provider) => {
      const fit = fitScore(provider, memory);
      const business = businessScore(provider);
      return { provider, name: providerName(provider), family: providerFamily(provider), fit, business, score: Math.round((business * 0.6 + fit * 0.4) * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score || b.fit - a.fit);
}
