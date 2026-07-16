export const PROVIDERS = [
  {
    id: "lumos",
    name: "Lumos Fiber",
    technology: "Fiber",
    reliability: "Excellent",
    latency: "Very Low",
    installEta: "1–3 days",
    typicalCommission: 175,
    customerFit: ["Remote work", "Gaming", "Streaming", "Smart homes"],
    notes: "Strong fiber-first recommendation where available. Symmetrical speeds are ideal for work-from-home and high-upload households.",
  },
  {
    id: "att",
    name: "AT&T Fiber",
    technology: "Fiber",
    reliability: "Excellent",
    latency: "Very Low",
    installEta: "2–5 days",
    typicalCommission: 125,
    customerFit: ["Remote work", "Streaming", "Multi-device homes"],
    notes: "Strong fiber option with high-speed tiers and national brand recognition.",
  },
  {
    id: "spectrum",
    name: "Spectrum",
    technology: "Cable",
    reliability: "Good",
    latency: "Moderate",
    installEta: "1–3 days",
    typicalCommission: 90,
    customerFit: ["Streaming", "Value shoppers", "Fast install"],
    notes: "Good fallback when fiber is unavailable. Upload speeds are typically lower than fiber.",
  },
  {
    id: "tmobile",
    name: "T-Mobile Home Internet",
    technology: "Fixed Wireless",
    reliability: "Variable",
    latency: "Moderate",
    installEta: "Same day self-install",
    typicalCommission: 75,
    customerFit: ["Renters", "Backup internet", "Fast setup"],
    notes: "Useful wireless option for customers who need quick setup or lack wired alternatives.",
  },
  {
    id: "verizon",
    name: "Verizon 5G Home",
    technology: "Fixed Wireless",
    reliability: "Variable",
    latency: "Moderate",
    installEta: "Same day self-install",
    typicalCommission: 85,
    customerFit: ["Wireless homes", "Fast setup", "Backup internet"],
    notes: "Strong wireless alternative in good 5G coverage areas.",
  },
  {
    id: "brightspeed",
    name: "Brightspeed",
    technology: "Fiber / DSL",
    reliability: "Mixed",
    latency: "Mixed",
    installEta: "3–7 days",
    typicalCommission: 70,
    customerFit: ["Rural homes", "Basic internet"],
    notes: "Can be valuable in areas with limited competitive options. Verify technology before recommending.",
  },
];

export function getProviderIntel(providerName = "") {
  const normalized = providerName.toLowerCase();
  return (
    PROVIDERS.find((provider) => normalized.includes(provider.name.toLowerCase().split(" ")[0])) ||
    PROVIDERS.find((provider) => provider.name.toLowerCase().includes(normalized)) ||
    null
  );
}
