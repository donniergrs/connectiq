import { plansForProvider } from "./productCatalog.js";

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9$%.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `$${Math.round(amount)}` : "an estimated lower monthly amount";
}

function providerName(provider = {}) {
  return provider.displayName || provider.name || provider.provider_name || "the selected provider";
}

function planName(plan = {}) {
  return plan.name || plan.productName || `${Number(plan.download || 0)} Mbps plan`;
}

function currentPlan(context = {}) {
  return context.quote?.recommendedPlan || {
    id: context.quote?.planId,
    name: context.quote?.productName,
    download: context.quote?.download,
    upload: context.quote?.upload,
    estimatedMonthlyPrice: context.quote?.monthlyPrice,
  };
}

function planPrice(plan = {}) {
  return Number(plan.estimatedMonthlyPrice ?? plan.monthlyPrice ?? plan.price ?? 0) || 0;
}

function currentProvider(context = {}) {
  return context.recommendation || context.providers?.find((provider) => providerName(provider) === context.quote?.provider) || {};
}

function availablePlans(context = {}) {
  return plansForProvider(currentProvider(context)).sort((a, b) => Number(a.download || 0) - Number(b.download || 0));
}

function findLowerPlan(context = {}) {
  const current = currentPlan(context);
  const download = Number(current.download || context.quote?.download || 0);
  return availablePlans(context).filter((plan) => Number(plan.download || 0) < download).at(-1) || null;
}

function findHigherPlan(context = {}) {
  const current = currentPlan(context);
  const download = Number(current.download || context.quote?.download || 0);
  return availablePlans(context).find((plan) => Number(plan.download || 0) > download) || null;
}

function findPlanBySpeed(message, context = {}) {
  const normalized = normalize(message);
  const speedMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(gig|gbps|g|mbps|meg)/);
  if (!speedMatch) return null;
  const raw = Number(speedMatch[1]);
  const target = /gig|gbps|\bg\b/.test(speedMatch[2]) ? raw * 1000 : raw;
  return availablePlans(context).reduce((best, plan) => {
    if (!best) return plan;
    return Math.abs(Number(plan.download || 0) - target) < Math.abs(Number(best.download || 0) - target) ? plan : best;
  }, null);
}

function householdSummary(needs = {}) {
  const pieces = [];
  if (needs.people) pieces.push(`${needs.people} ${Number(needs.people) === 1 ? "person" : "people"}`);
  if (needs.devices) pieces.push(`${needs.devices} connected devices`);
  if (needs.workFromHome) pieces.push("remote work");
  if (needs.gaming) pieces.push("gaming");
  if (needs.streaming) pieces.push("streaming");
  if (needs.creator) pieces.push("large uploads");
  return pieces.length ? pieces.join(", ") : "the household profile you provided";
}

function whyPlanAnswer(context = {}) {
  const quote = context.quote || {};
  const plan = currentPlan(context);
  const reasons = Array.isArray(quote.reasons) ? quote.reasons.filter(Boolean) : [];
  const base = `I recommended ${planName(plan)} because it is sized for ${householdSummary(context.needs)}.`;
  const detail = reasons.length ? ` ${reasons.slice(0, 2).join(" ")}` : " It is the lowest planning tier that meets the estimated demand without pushing you into unnecessary capacity.";
  return `${base}${detail} Final plan availability and price still require provider confirmation.`;
}

function slowerPlanAnswer(context = {}, requestedPlan = null) {
  const lower = requestedPlan || findLowerPlan(context);
  const current = currentPlan(context);
  if (!lower) return `I do not see a lower planning tier beneath ${planName(current)} for this provider in the current catalog. Final provider options may differ during ordering.`;

  const needs = context.needs || {};
  const demandSignals = Number(needs.devices || 0) >= 20 || needs.creator || (needs.workFromHome && needs.gaming) || String(needs.priority).toLowerCase() === "speed";
  const savings = Math.max(0, planPrice(current) - planPrice(lower));
  const savingsText = savings ? `about $${savings} per month in the planning estimate` : "some monthly cost";
  if (demandSignals) {
    return `${planName(lower)} may work, but it provides less headroom for ${householdSummary(needs)}. It could save ${savingsText}, while increasing the chance of congestion when several activities happen at once. I would keep ${planName(current)} unless lowering the monthly cost is your top priority.`;
  }
  return `${planName(lower)} is a reasonable lower-cost option for your current profile and could save ${savingsText}. The tradeoff is less capacity for future devices or simultaneous high-bandwidth use.`;
}

function fasterPlanAnswer(context = {}, requestedPlan = null) {
  const higher = requestedPlan || findHigherPlan(context);
  const current = currentPlan(context);
  if (!higher) return `${planName(current)} is already the highest planning tier available for this provider in the current catalog. Final provider offerings may differ.`;
  const difference = Math.max(0, planPrice(higher) - planPrice(current));
  return `${planName(higher)} offers more capacity, but your current profile does not show a clear need for it. It would add ${money(difference)} per month to the planning estimate${difference ? "" : " or more"}. I would move up only if you expect substantially more devices, frequent large uploads, or multiple simultaneous heavy users.`;
}

function budgetAnswer(message, context = {}) {
  const normalized = normalize(message);
  const statedMatch = normalized.match(/\$?\s*(\d{2,3})/);
  const statedBudget = statedMatch ? Number(statedMatch[1]) : Number(context.needs?.budget || 0);
  const current = currentPlan(context);
  const currentPrice = Number(context.quote?.pricing?.amount ?? context.quote?.monthlyPrice ?? planPrice(current));
  const lower = findLowerPlan(context);
  if (statedBudget && currentPrice && currentPrice <= statedBudget) {
    return `${planName(current)} is currently estimated at ${money(currentPrice)} per month, which is within the ${money(statedBudget)} target you mentioned. Final pricing, taxes, fees, and promotions are confirmed during ordering.`;
  }
  if (lower) {
    return `The current ${planName(current)} estimate is ${money(currentPrice)} per month. ${planName(lower)} is the closest lower-cost planning option at about ${money(planPrice(lower))} per month, but it provides less headroom for ${householdSummary(context.needs)}.`;
  }
  return `The current planning estimate is ${money(currentPrice)} per month. I do not see a lower tier in the current catalog, so the final provider offer would need to be checked for promotions or alternate plans.`;
}

function growthAnswer(context = {}) {
  const current = currentPlan(context);
  const higher = findHigherPlan(context);
  const devices = Number(context.needs?.devices || 0);
  const remainingHeadroom = Math.max(0, Math.floor(Number(current.download || 0) / 25) - devices);
  if (remainingHeadroom >= 10) {
    return `${planName(current)} has reasonable room for growth beyond your current ${devices || "reported"} devices. I would keep this tier unless you add many simultaneous gamers, 4K streams, cameras, or large-upload users.`;
  }
  if (higher) {
    return `${planName(current)} fits today, but your profile is already using much of its planning headroom. If your household adds many more active devices, ${planName(higher)} would be the next tier to consider.`;
  }
  return `${planName(current)} is the strongest available planning tier in the current catalog. If usage grows significantly, Wi-Fi design and device management may matter as much as raw plan speed.`;
}

function nextBestAnswer(context = {}) {
  const recommendation = currentProvider(context);
  const currentId = recommendation.id || recommendation.providerId || providerName(recommendation);
  const alternative = (context.providers || []).find((provider) => (provider.id || provider.providerId || providerName(provider)) !== currentId);
  if (!alternative) return "I do not have a second verified provider option to compare at this address.";
  const currentScore = Number(recommendation.advisorScore || 0);
  const altScore = Number(alternative.advisorScore || 0);
  const difference = Math.max(0, currentScore - altScore);
  return `${providerName(alternative)} is the next-best verified option at this address${altScore ? ` with a ${altScore}/100 match` : ""}. ${providerName(recommendation)} stayed ahead${difference ? ` by ${difference} points` : ""} because it better matched ${householdSummary(context.needs)}. The alternative may still be worth considering if its confirmed price or promotion is better.`;
}

function inferFollowUp(message, conversation = []) {
  const normalized = normalize(message);
  if (!/^(what about|how about|and|why|would that|is that|could that|what if)/.test(normalized)) return "";
  const recentAdvisor = [...conversation].reverse().find((item) => item?.role === "advisor")?.text || "";
  if (/slower|lower-cost|lower tier|save money|less headroom/i.test(recentAdvisor)) return "slower";
  if (/higher|faster|move up|next tier/i.test(recentAdvisor)) return "faster";
  if (/budget|monthly|cost|price/i.test(recentAdvisor)) return "budget";
  if (/next-best|alternative|compare/i.test(recentAdvisor)) return "alternative";
  return "";
}

export function detectQuoteIntent(message = "", context = {}) {
  const normalized = normalize(message);
  const followUp = inferFollowUp(message, context.conversation || []);
  if (/slower|lower tier|less speed|enough|overkill|save money|cheaper/.test(normalized)) return "slower";
  if (/faster|higher tier|more speed|2 gig|5 gig|why not.*gig/.test(normalized)) return "faster";
  if (/why.*(plan|tier)|why.*(gig|mbps)|recommend.*(plan|tier)|why this quote/.test(normalized)) return "why-plan";
  if (/budget|afford|under \$|only \$|monthly limit/.test(normalized)) return "budget";
  if (/more devices|add devices|future|grow|kids.*gaming|smart home/.test(normalized)) return "growth";
  if (/next best|other provider|alternative|compare quote|what about spectrum|what about wow|what about att|what about at&t/.test(normalized)) return "alternative";
  return followUp;
}

export function answerQuoteQuestion(message = "", context = {}) {
  if (!context.quote) return null;
  const intent = detectQuoteIntent(message, context);
  const requestedPlan = findPlanBySpeed(message, context);
  if (intent === "why-plan") return whyPlanAnswer(context);
  if (intent === "slower") return slowerPlanAnswer(context, requestedPlan && Number(requestedPlan.download) < Number(currentPlan(context).download || 0) ? requestedPlan : null);
  if (intent === "faster") return fasterPlanAnswer(context, requestedPlan && Number(requestedPlan.download) > Number(currentPlan(context).download || 0) ? requestedPlan : null);
  if (intent === "budget") return budgetAnswer(message, context);
  if (intent === "growth") return growthAnswer(context);
  if (intent === "alternative") return nextBestAnswer(context);
  return null;
}
