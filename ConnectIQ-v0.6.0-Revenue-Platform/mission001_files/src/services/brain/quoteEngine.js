function money(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildQuote({ recommendation, address, needs = [] }) {
  if (!recommendation) return null;

  const product = recommendation.revenueProduct || {};
  const monthlyPrice = money(
    product.monthlyPrice ||
      recommendation.monthlyPrice ||
      recommendation.price,
    79.99
  );
  const installFee = money(
    product.installFee ?? recommendation.installFee,
    0
  );
  const commission = money(
    product.commission ||
      recommendation.commissionResidential ||
      recommendation.commission,
    0
  );
  const spiff = money(product.spiff || recommendation.spiff, 0);
  const residualMonthly = money(product.residualMonthly, 0);

  return {
    provider: recommendation.displayName || recommendation.name,
    productName:
      product.productName ||
      `${recommendation.download || ""} Mbps ${recommendation.technology || "Internet"}`.trim(),
    address,
    technology: recommendation.technology || "Broadband",
    download: recommendation.download || 0,
    upload: recommendation.upload || 0,
    monthlyPrice,
    installFee,
    contract: product.contractRequired ? "Contract required" : "No annual contract",
    promotion:
      product.promotion ||
      recommendation.promotion ||
      recommendation.promo ||
      "Current offers subject to provider confirmation.",
    commission,
    spiff,
    residualMonthly,
    annualRevenueOpportunity:
      recommendation.annualRevenueOpportunity ||
      commission + spiff + residualMonthly * 12,
    advisorScore: recommendation.advisorScore || 0,
    revenueScore: recommendation.revenueScore || 0,
    customerScore: recommendation.customerScore || 0,
    customerNeeds: needs,
    createdAt: new Date().toISOString(),
  };
}
