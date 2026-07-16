export const providerProducts = [
  {
    id: "att-fiber-1000",
    providerId: "att",
    provider: "AT&T Fiber",
    productName: "AT&T Fiber 1 Gig",
    technology: "Fiber",
    download: 1000,
    upload: 1000,
    monthlyPrice: 80,
    commission: 175,
    spiff: 200,
    residualMonthly: 5,
    promotion: "$200 reward card where available",
    contractRequired: false,
  },
  {
    id: "spectrum-gig",
    providerId: "spectrum",
    provider: "Spectrum",
    productName: "Spectrum Internet Gig",
    technology: "Cable",
    download: 1000,
    upload: 35,
    monthlyPrice: 90,
    commission: 120,
    spiff: 150,
    residualMonthly: 0,
    promotion: "Free modem on select plans",
    contractRequired: false,
  },
  {
    id: "verizon-5g-home",
    providerId: "verizon",
    provider: "Verizon",
    productName: "Verizon 5G Home Internet",
    technology: "Fixed Wireless",
    download: 300,
    upload: 20,
    monthlyPrice: 60,
    commission: 100,
    spiff: 75,
    residualMonthly: 0,
    promotion: "5G Home offers vary by market",
    contractRequired: false,
  },
  {
    id: "tmobile-home",
    providerId: "tmobile",
    provider: "T-Mobile Home Internet",
    productName: "T-Mobile Home Internet",
    technology: "Fixed Wireless",
    download: 245,
    upload: 25,
    monthlyPrice: 50,
    commission: 90,
    spiff: 50,
    residualMonthly: 0,
    promotion: "5G Home Internet promotions vary",
    contractRequired: false,
  }
];

export function findRevenueProducts(provider = {}) {
  const name = String(provider.displayName || provider.name || provider.brandName || "").toLowerCase();
  const profileId = provider.carrierProfileId;

  return providerProducts.filter((product) => {
    return product.providerId === profileId || name.includes(product.provider.toLowerCase().split(" ")[0]);
  });
}

export function calculateRevenueOpportunity(product = {}) {
  return Number(product.commission || 0) + Number(product.spiff || 0) + Number(product.residualMonthly || 0) * 12;
}

export function getBestRevenueProduct(provider = {}) {
  const products = findRevenueProducts(provider);

  return products
    .map((product) => ({
      ...product,
      annualRevenueOpportunity: calculateRevenueOpportunity(product),
    }))
    .sort((a, b) => b.annualRevenueOpportunity - a.annualRevenueOpportunity)[0] || null;
}
