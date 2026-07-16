const TECHNOLOGY_CATALOG = Object.freeze({
  fiber: [
    { id: "fiber-300", name: "Fiber 300", download: 300, upload: 300, estimatedMonthlyPrice: 55 },
    { id: "fiber-500", name: "Fiber 500", download: 500, upload: 500, estimatedMonthlyPrice: 65 },
    { id: "fiber-1000", name: "Fiber 1 Gig", download: 1000, upload: 1000, estimatedMonthlyPrice: 80 },
    { id: "fiber-2000", name: "Fiber 2 Gig", download: 2000, upload: 2000, estimatedMonthlyPrice: 120 },
    { id: "fiber-5000", name: "Fiber 5 Gig", download: 5000, upload: 5000, estimatedMonthlyPrice: 180 },
  ],
  cable: [
    { id: "cable-300", name: "Internet 300", download: 300, upload: 20, estimatedMonthlyPrice: 50 },
    { id: "cable-500", name: "Internet 500", download: 500, upload: 25, estimatedMonthlyPrice: 65 },
    { id: "cable-1000", name: "Internet 1 Gig", download: 1000, upload: 35, estimatedMonthlyPrice: 85 },
    { id: "cable-1200", name: "Internet 1.2 Gig", download: 1200, upload: 50, estimatedMonthlyPrice: 100 },
  ],
  fixedWireless: [
    { id: "wireless-100", name: "Home Internet 100", download: 100, upload: 10, estimatedMonthlyPrice: 50 },
    { id: "wireless-300", name: "Home Internet 300", download: 300, upload: 20, estimatedMonthlyPrice: 60 },
  ],
  dsl: [
    { id: "dsl-50", name: "Internet 50", download: 50, upload: 10, estimatedMonthlyPrice: 55 },
    { id: "dsl-100", name: "Internet 100", download: 100, upload: 20, estimatedMonthlyPrice: 65 },
  ],
  satellite: [
    { id: "satellite-100", name: "Satellite Internet 100", download: 100, upload: 10, estimatedMonthlyPrice: 90 },
    { id: "satellite-200", name: "Satellite Internet 200", download: 200, upload: 20, estimatedMonthlyPrice: 120 },
  ],
  broadband: [
    { id: "broadband-100", name: "Internet 100", download: 100, upload: 10, estimatedMonthlyPrice: 60 },
    { id: "broadband-300", name: "Internet 300", download: 300, upload: 20, estimatedMonthlyPrice: 75 },
    { id: "broadband-1000", name: "Internet 1 Gig", download: 1000, upload: 35, estimatedMonthlyPrice: 95 },
  ],
});

function normalize(value = "") {
  return String(value).toLowerCase();
}

export function catalogTechnologyKey(provider = {}) {
  const technology = normalize(
    provider.technology || provider.technologyType || provider.technology_code_type || provider.technologyCodeType,
  );
  if (technology.includes("fiber")) return "fiber";
  if (technology.includes("cable")) return "cable";
  if (technology.includes("fixed wireless") || technology.includes("5g") || technology.includes("wireless")) return "fixedWireless";
  if (technology.includes("dsl")) return "dsl";
  if (technology.includes("satellite")) return "satellite";
  return "broadband";
}

export function plansForProvider(provider = {}) {
  const explicitPlans = provider.productCatalog || provider.plans || provider.products;
  if (Array.isArray(explicitPlans) && explicitPlans.length) {
    return explicitPlans.map((plan, index) => ({
      id: plan.id || `${catalogTechnologyKey(provider)}-explicit-${index + 1}`,
      name: plan.name || plan.productName || `${plan.download || plan.speed || "Available"} Mbps Internet`,
      download: Number(plan.download ?? plan.maxdown ?? plan.speed ?? 0) || 0,
      upload: Number(plan.upload ?? plan.maxup ?? 0) || 0,
      estimatedMonthlyPrice: Number(plan.estimatedMonthlyPrice ?? plan.monthlyPrice ?? plan.price ?? 0) || 0,
      source: "provider-catalog",
      ...plan,
    }));
  }

  const maximumDownload = Number(provider.download ?? provider.maxdown ?? provider.maxDownload ?? 0) || 0;
  const maximumUpload = Number(provider.upload ?? provider.maxup ?? provider.maxUpload ?? 0) || 0;
  const plans = TECHNOLOGY_CATALOG[catalogTechnologyKey(provider)] || TECHNOLOGY_CATALOG.broadband;
  const available = maximumDownload
    ? plans.filter((plan) => plan.download <= maximumDownload)
    : plans;
  const fallback = plans.find((plan) => plan.download >= Math.min(maximumDownload || 100, 100)) || plans[0];

  return (available.length ? available : [fallback]).map((plan) => ({
    ...plan,
    upload: maximumUpload ? Math.min(plan.upload, maximumUpload) : plan.upload,
    source: "curated-estimate",
  }));
}

export { TECHNOLOGY_CATALOG };
