import { plansForProvider } from "./productCatalog.js";
import { estimateFirstMonth, estimateMonthlyPrice } from "./pricingEngine.js";
import { installationGuidance } from "./installationEngine.js";

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function targetSpeed(needs = {}) {
  const people = Math.max(1, number(needs.people, 2));
  const devices = Math.max(1, number(needs.devices, 5));
  let target = people * 50 + devices * 8;

  if (needs.streaming) target += 100;
  if (needs.gaming) target += 100;
  if (needs.workFromHome) target += 100;
  if (needs.creator) target += 250;
  if (String(needs.priority).toLowerCase() === "speed") target *= 1.4;
  if (String(needs.priority).toLowerCase() === "price") target *= 0.8;

  return Math.max(100, Math.round(target));
}

export function selectRecommendedPlan(provider = {}, needs = {}) {
  const plans = plansForProvider(provider)
    .filter(Boolean)
    .sort((a, b) => number(a.download) - number(b.download));
  if (!plans.length) return null;

  const target = targetSpeed(needs);
  const budget = number(needs.budget);
  const priority = String(needs.priority || "reliability").toLowerCase();
  const capable = plans.filter((plan) => number(plan.download) >= target);
  const pool = capable.length ? capable : plans;

  if (priority === "price" && budget) {
    const withinBudget = pool.filter((plan) => number(plan.estimatedMonthlyPrice) <= budget);
    if (withinBudget.length) return withinBudget[0];
  }

  if (priority === "speed") return pool[pool.length - 1];
  return pool[0];
}

function quoteReasons(plan = {}, needs = {}) {
  const reasons = [];
  const download = number(plan.download);
  const upload = number(plan.upload);
  const devices = number(needs.devices);

  if (needs.workFromHome && upload >= 20) reasons.push(`${upload} Mbps estimated upload capacity supports video calls and cloud work.`);
  if (needs.gaming) reasons.push("The recommended speed tier leaves room for gaming while other devices are active.");
  if (needs.streaming && download >= 300) reasons.push(`${download} Mbps is sized for simultaneous HD and 4K streaming.`);
  if (needs.creator && upload >= 100) reasons.push("Higher upload capacity is a strong fit for large files and content publishing.");
  if (devices >= 20 && download >= 500) reasons.push("The plan provides headroom for a high-device household.");
  if (number(needs.budget) && number(plan.estimatedMonthlyPrice) <= number(needs.budget)) reasons.push("The planning estimate falls within the monthly budget you selected.");
  if (!reasons.length) reasons.push("This is the lowest available planning tier that meets the household demand estimate.");

  return reasons.slice(0, 4);
}

function quoteVersion() {
  return "3D-1.0";
}

export function buildIntelligentQuote({ recommendation, address, needs = {} } = {}) {
  if (!recommendation) return null;
  const plan = selectRecommendedPlan(recommendation, needs);
  if (!plan) return null;

  const pricing = estimateMonthlyPrice(plan, recommendation);
  const installation = installationGuidance(recommendation);
  const explicitInstallFee = number(recommendation.revenueProduct?.installFee ?? recommendation.installFee);
  const equipmentFee = number(recommendation.revenueProduct?.equipmentFee ?? recommendation.equipmentFee);
  const reasons = quoteReasons(plan, needs);
  const createdAt = new Date().toISOString();

  return {
    quoteVersion: quoteVersion(),
    quoteId: globalThis.crypto?.randomUUID?.() || `quote-${Date.now()}`,
    createdAt,
    expiresAt: null,
    status: "Estimate",
    provider: recommendation.displayName || recommendation.name || "Available Provider",
    providerId: recommendation.id || recommendation.providerId || "",
    address: address || "",
    recommendedPlan: {
      id: plan.id,
      name: plan.name,
      download: number(plan.download),
      upload: number(plan.upload),
      source: plan.source || "curated-estimate",
    },
    productName: plan.name,
    technology: recommendation.technology || recommendation.technologyType || "Broadband",
    download: number(plan.download),
    upload: number(plan.upload),
    pricing,
    monthlyPrice: pricing.amount,
    installFee: explicitInstallFee,
    equipmentFee,
    estimatedFirstMonth: estimateFirstMonth(pricing.amount, explicitInstallFee, equipmentFee),
    installation,
    contract: recommendation.revenueProduct?.contractRequired
      ? "Contract requirement indicated — verify current terms"
      : "Contract terms require provider confirmation",
    promotion: recommendation.revenueProduct?.promotion || recommendation.promotion || recommendation.promo || "Current promotions require provider confirmation.",
    advisorScore: number(recommendation.advisorScore),
    customerScore: number(recommendation.customerScore),
    reasons,
    customerNeeds: needs,
    targetSpeed: targetSpeed(needs),
    assumptions: [
      "Plan availability is inferred from verified maximum service speed and curated planning tiers.",
      "Pricing is an estimate unless explicitly supplied by a provider data source.",
      "Final taxes, equipment, promotion eligibility, contract terms, and installation details require confirmation.",
    ],
    disclaimer: pricing.disclaimer,
  };
}
