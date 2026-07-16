export const STATUS_FLOW = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Quote Sent",
  "Sale Closed",
  "Install Scheduled",
  "Installed",
  "Lost",
];

export const PROVIDER_INTELLIGENCE = {
  lumos: {
    id: "lumos",
    name: "Lumos Fiber",
    technology: "Fiber",
    reliability: 96,
    latencyMs: 4,
    installEta: "1–3 days",
    contract: "No annual contract",
    dataCap: "Unlimited",
    promo: "Free installation where available",
    estimatedPrice: 69,
    commission: 175,
    strengths: ["Symmetrical upload", "Low latency", "Strong reliability", "Best for work from home"],
  },
  att: {
    id: "att",
    name: "AT&T Fiber",
    technology: "Fiber",
    reliability: 94,
    latencyMs: 6,
    installEta: "2–5 days",
    contract: "No annual contract on many plans",
    dataCap: "Unlimited on fiber",
    promo: "Gift card offers may apply",
    estimatedPrice: 75,
    commission: 125,
    strengths: ["Fiber network", "Strong speeds", "National support", "Good upload performance"],
  },
  spectrum: {
    id: "spectrum",
    name: "Spectrum",
    technology: "Cable",
    reliability: 82,
    latencyMs: 24,
    installEta: "1–2 days",
    contract: "No annual contract",
    dataCap: "Unlimited in most areas",
    promo: "Introductory pricing may apply",
    estimatedPrice: 59,
    commission: 90,
    strengths: ["Fast installation", "Wide availability", "Good download speeds", "Budget-friendly entry plans"],
  },
  tmobile: {
    id: "tmobile",
    name: "T-Mobile Home Internet",
    technology: "Fixed Wireless",
    reliability: 72,
    latencyMs: 45,
    installEta: "Same day self-install",
    contract: "No annual contract",
    dataCap: "Unlimited with network management",
    promo: "Self-install equipment",
    estimatedPrice: 50,
    commission: 80,
    strengths: ["Fast setup", "No technician needed", "Simple pricing", "Good backup option"],
  },
};

export function getProviderProfile(provider = {}) {
  const key = String(provider.id || provider.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = PROVIDER_INTELLIGENCE[key] ||
    Object.values(PROVIDER_INTELLIGENCE).find((item) =>
      String(provider.name || "").toLowerCase().includes(item.name.toLowerCase().split(" ")[0])
    );

  return {
    reliability: 70,
    latencyMs: provider.technology === "Fiber" ? 8 : provider.technology === "Cable" ? 25 : 45,
    installEta: "2–5 days",
    contract: "Varies by plan",
    dataCap: "Varies",
    promo: "Ask advisor for current offers",
    estimatedPrice: provider.technology === "Fiber" ? 75 : 60,
    commission: provider.technology === "Fiber" ? 150 : 80,
    strengths: ["Available at searched address", "Advisor can verify latest plans"],
    ...(match || {}),
    ...provider,
  };
}

export function formatCurrency(value = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}
