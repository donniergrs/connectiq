const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
const ratioScore = (value, target) => clamp((Number(value || 0) / Math.max(1, Number(target || 1))) * 100);

function normalizeTechnology(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("fiber") || text.includes("fttp")) return "fiber";
  if (text.includes("cable") || text.includes("docsis")) return "cable";
  if (text.includes("fixed") || text.includes("wireless")) return "fixed_wireless";
  if (text.includes("dsl") || text.includes("copper")) return "dsl";
  if (text.includes("satellite")) return "satellite";
  return "other";
}

export function normalizeProvider(provider = {}, index = 0) {
  const name = provider.name || provider.provider_name || provider.brand_name || `Provider ${index + 1}`;
  return {
    id: String(provider.id || provider.provider_id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    name,
    technology: normalizeTechnology(provider.technology || provider.technology_code_type || provider.tech),
    downloadMbps: Number(provider.downloadMbps ?? provider.download ?? provider.maxdown ?? provider.max_download_mbps ?? 0),
    uploadMbps: Number(provider.uploadMbps ?? provider.upload ?? provider.maxup ?? provider.max_upload_mbps ?? 0),
    lowLatency: Boolean(provider.lowLatency ?? provider.lowlatency),
    monthlyPrice: provider.monthlyPrice == null ? null : Number(provider.monthlyPrice),
    reliabilityScore: provider.reliabilityScore == null ? null : clamp(provider.reliabilityScore),
    residential: provider.residential !== false,
    business: provider.business !== false,
    economics: { ...(provider.economics || {}) },
    raw: provider,
  };
}

function technologyScore(technology, profile) {
  const heavy = Boolean(profile.workFromHome || profile.gaming || profile.heavyStreaming || profile.uploadIntensive);
  const table = heavy
    ? { fiber: 100, cable: 78, fixed_wireless: 62, dsl: 42, satellite: 20, other: 45 }
    : { fiber: 100, cable: 88, fixed_wireless: 75, dsl: 55, satellite: 35, other: 50 };
  return table[technology] ?? 50;
}

export function scoreCustomerFit(provider, profile = {}, config) {
  const weights = config.customerFit;
  const requiredDownload = Number(profile.minimumDownloadMbps || (profile.gaming || profile.workFromHome ? 300 : 100));
  const requiredUpload = Number(profile.minimumUploadMbps || (profile.workFromHome || profile.uploadIntensive ? 50 : 20));
  const tech = technologyScore(provider.technology, profile);
  const download = ratioScore(provider.downloadMbps, requiredDownload);
  const upload = ratioScore(provider.uploadMbps, requiredUpload);
  const latency = provider.lowLatency ? 100 : provider.technology === "satellite" ? 15 : 65;
  const reliability = provider.reliabilityScore ?? ({ fiber: 95, cable: 82, fixed_wireless: 68, dsl: 58, satellite: 45 }[provider.technology] || 60);
  let priceValue = 65;
  if (provider.monthlyPrice != null && profile.budget != null) {
    priceValue = provider.monthlyPrice <= Number(profile.budget) ? 100 : clamp(100 - ((provider.monthlyPrice - Number(profile.budget)) / Math.max(1, Number(profile.budget))) * 100);
  }
  const weighted = (
    tech * weights.technology + download * weights.downloadSpeed + upload * weights.uploadSpeed +
    latency * weights.latency + reliability * weights.reliability + priceValue * weights.priceValue
  ) / Object.values(weights).reduce((a,b)=>a+b,0);
  return {
    score: Math.round(clamp(weighted)),
    components: { technology: Math.round(tech), downloadSpeed: Math.round(download), uploadSpeed: Math.round(upload), latency: Math.round(latency), reliability: Math.round(reliability), priceValue: Math.round(priceValue) },
  };
}

export function scoreBusiness(provider, config) {
  const e = provider.economics || {};
  const oneTime = ratioScore(e.oneTimeCommission, config.economics.oneTimeCommissionTarget);
  const recurring = ratioScore(Number(e.monthlyResidual || 0) * 12, config.economics.recurringAnnualTarget);
  const spiff = ratioScore(e.spiff, config.economics.spiffTarget);
  const conversion = e.conversionRate == null ? 50 : clamp(Number(e.conversionRate) * (Number(e.conversionRate) <= 1 ? 100 : 1));
  const installSuccess = e.installSuccessRate == null ? 50 : clamp(Number(e.installSuccessRate) * (Number(e.installSuccessRate) <= 1 ? 100 : 1));
  const cancellation = e.cancellationRate == null ? 50 : clamp(100 - Number(e.cancellationRate) * (Number(e.cancellationRate) <= 1 ? 100 : 1));
  const score = oneTime * .35 + recurring * .20 + spiff * .15 + conversion * .10 + installSuccess * .10 + cancellation * .10;
  return { score: Math.round(clamp(score)), components: { oneTimeCommission: Math.round(oneTime), recurringRevenue: Math.round(recurring), spiff: Math.round(spiff), conversion: Math.round(conversion), installSuccess: Math.round(installSuccess), retention: Math.round(cancellation) } };
}

export function qualification(provider, profile = {}) {
  const reasons = [];
  if (profile.customerType === "business" && !provider.business) reasons.push("Business service is not supported.");
  if (profile.customerType !== "business" && !provider.residential) reasons.push("Residential service is not supported.");
  if (profile.minimumDownloadMbps && provider.downloadMbps && provider.downloadMbps < Number(profile.minimumDownloadMbps)) reasons.push("Download speed is below the stated minimum.");
  if (profile.minimumUploadMbps && provider.uploadMbps && provider.uploadMbps < Number(profile.minimumUploadMbps)) reasons.push("Upload speed is below the stated minimum.");
  return { eligible: reasons.length === 0, reasons };
}
