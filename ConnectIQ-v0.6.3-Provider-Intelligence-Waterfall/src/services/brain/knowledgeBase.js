import { providerTechnology } from "./recommendationEngine.js";

const TECHNOLOGY_KNOWLEDGE = {
  fiber: {
    label: "fiber",
    strengths: ["high reliability", "low latency", "strong upload performance"],
    considerations: ["installation may require a technician or new fiber drop"],
    bestFor: ["remote work", "gaming", "content creation", "large connected households"],
  },
  cable: {
    label: "cable",
    strengths: ["broad availability", "strong download speeds", "familiar installation options"],
    considerations: ["upload speeds are usually lower than fiber", "performance can vary during neighborhood peak usage"],
    bestFor: ["streaming", "general household use", "value-focused plans"],
  },
  fixedWireless: {
    label: "fixed wireless",
    strengths: ["quick setup potential", "no wired connection required in some homes"],
    considerations: ["performance can vary with signal strength, congestion, and location"],
    bestFor: ["flexible installation", "everyday browsing", "backup connectivity"],
  },
  satellite: {
    label: "satellite",
    strengths: ["coverage in locations with limited wired options"],
    considerations: ["higher latency", "weather and data-policy considerations may apply"],
    bestFor: ["rural availability where wired service is limited"],
  },
  dsl: {
    label: "DSL",
    strengths: ["uses existing telephone wiring", "can be available where newer networks are not"],
    considerations: ["speeds are usually lower than fiber or cable", "performance depends on distance from network equipment"],
    bestFor: ["basic browsing and lighter household use"],
  },
  broadband: {
    label: "broadband",
    strengths: ["verified availability at the service address"],
    considerations: ["plan details require provider confirmation"],
    bestFor: ["general internet access"],
  },
};

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function providerName(provider = {}) {
  return provider.displayName || provider.name || provider.brandName || provider.providerName || "this provider";
}

function providerDownload(provider = {}) {
  return Number(provider.download ?? provider.maxdown ?? provider.maxDownload ?? 0) || 0;
}

function providerUpload(provider = {}) {
  return Number(provider.upload ?? provider.maxup ?? provider.maxUpload ?? 0) || 0;
}

function providerPrice(provider = {}) {
  return Number(provider.monthlyPrice ?? provider.revenueProduct?.monthlyPrice ?? 0) || 0;
}

function technologyKey(provider = {}) {
  const tech = normalize(providerTechnology(provider));
  if (tech.includes("fiber")) return "fiber";
  if (tech.includes("cable")) return "cable";
  if (tech.includes("fixed wireless") || tech.includes("5g") || tech.includes("wireless")) return "fixedWireless";
  if (tech.includes("satellite")) return "satellite";
  if (tech.includes("dsl")) return "dsl";
  return "broadband";
}

function providerSummary(provider = {}) {
  const knowledge = TECHNOLOGY_KNOWLEDGE[technologyKey(provider)];
  const download = providerDownload(provider);
  const upload = providerUpload(provider);
  const speed = download ? `${download} Mbps download${upload ? ` and ${upload} Mbps upload` : ""}` : "verified broadband availability";
  return `${providerName(provider)} uses ${knowledge.label} service and shows ${speed}.`;
}

function findMentionedProvider(message, providers = []) {
  const normalizedMessage = normalize(message);
  const genericProviderWords = new Set([
    "internet", "cable", "phone", "fiber", "wireless", "home", "service", "broadband",
  ]);

  return providers.find((provider) => {
    const name = normalize(providerName(provider));
    if (!name) return false;
    if (normalizedMessage.includes(name)) return true;

    const distinctive = name
      .split(" ")
      .filter((part) => part.length > 2 && !genericProviderWords.has(part));

    return distinctive.some((part) => normalizedMessage.includes(part));
  }) || null;
}

function householdReason(needs = {}) {
  const reasons = [];
  if (needs.workFromHome) reasons.push("remote work");
  if (needs.gaming) reasons.push("gaming");
  if (needs.streaming) reasons.push("streaming");
  if (needs.creator) reasons.push("uploading content");
  if (Number(needs.devices) >= 20) reasons.push("a high-device household");
  return reasons.length ? reasons.join(", ") : "your household needs";
}

function recommendationAnswer(context = {}) {
  const recommendation = context.recommendation;
  if (!recommendation) return "I need a completed address lookup and household profile before I can explain a recommendation.";
  const reasons = recommendation.recommendationReasons || [recommendation.recommendationReason].filter(Boolean);
  const details = reasons.length ? reasons.slice(0, 3).join(" ") : `${providerName(recommendation)} has the strongest overall score for ${householdReason(context.needs)}.`;
  return `I recommend ${providerName(recommendation)} at ${recommendation.advisorScore || recommendation.customerScore || "the top"}/100 because ${details}`;
}

function compareAnswer(target, context = {}) {
  const recommendation = context.recommendation;
  if (!target) return recommendationAnswer(context);
  if (!recommendation) return `${providerSummary(target)} I need your completed household profile before I can compare it to a top recommendation.`;
  if (providerName(target) === providerName(recommendation)) return recommendationAnswer(context);

  const targetScore = Number(target.advisorScore || target.customerScore || 0);
  const topScore = Number(recommendation.advisorScore || recommendation.customerScore || 0);
  const targetKnowledge = TECHNOLOGY_KNOWLEDGE[technologyKey(target)];
  const topKnowledge = TECHNOLOGY_KNOWLEDGE[technologyKey(recommendation)];
  const scoreText = targetScore && topScore ? ` It scored ${targetScore}/100 compared with ${topScore}/100.` : "";
  return `${providerName(target)} is a valid option, and ${providerSummary(target)} ${providerName(recommendation)} ranked higher because ${topKnowledge.strengths.slice(0, 2).join(" and ")} better match ${householdReason(context.needs)}.${scoreText} The main tradeoff with ${providerName(target)} is ${targetKnowledge.considerations[0]}.`;
}

function bestForAnswer(topic, context = {}) {
  const providers = context.providers || [];
  const ranked = [...providers];
  if (!ranked.length) return `I need to check your address before I can identify the best option for ${topic}.`;
  const top = ranked.find((provider) => {
    const key = technologyKey(provider);
    if (["gaming", "remote work", "uploads"].includes(topic)) return key === "fiber";
    if (topic === "streaming") return providerDownload(provider) >= 300;
    return false;
  }) || ranked[0];
  return `${providerName(top)} is the strongest available option for ${topic}. ${providerSummary(top)} Its connection profile aligns well with ${topic}, while final plan and equipment details still require provider confirmation.`;
}

function priceAnswer(context = {}) {
  const recommendation = context.recommendation;
  const quote = context.quote;
  if (quote?.monthlyPrice) return `Your current estimate for ${quote.provider || providerName(recommendation)} is about $${Number(quote.monthlyPrice).toFixed(2)} per month. Taxes, equipment, installation charges, promotions, and eligibility must be confirmed before submission.`;
  const knownPrice = providerPrice(recommendation);
  if (knownPrice) return `${providerName(recommendation)} currently shows an estimated monthly price of about $${knownPrice.toFixed(2)}. Final taxes, equipment, promotions, and eligibility require confirmation.`;
  return "The FCC availability data does not include a guaranteed retail price. ConnectIQ will confirm the selected plan, equipment, taxes, promotions, and eligibility before the order is submitted.";
}

function installationAnswer(context = {}) {
  const recommendation = context.recommendation;
  if (!recommendation) return "Installation timing depends on the provider, technology, and service address. ConnectIQ confirms the available appointment window before order submission.";
  const knowledge = TECHNOLOGY_KNOWLEDGE[technologyKey(recommendation)];
  return `${providerName(recommendation)} uses ${knowledge.label} service. ${knowledge.considerations[0]}. Exact appointment timing and any installation charge are confirmed before submission.`;
}

function contractAnswer(context = {}) {
  const recommendation = context.recommendation;
  const name = recommendation ? providerName(recommendation) : "the selected provider";
  return `Contract terms for ${name} can vary by plan and promotion. I will not assume a contract term from availability data alone; ConnectIQ confirms the current agreement, cancellation terms, and promotional conditions before submission.`;
}

function portingAnswer(context = {}) {
  const recommendation = context.recommendation;
  const name = recommendation ? providerName(recommendation) : "the selected provider";
  return `Keeping an existing phone number is often possible when voice service is offered, but it must be verified for ${name}. Keep the current phone service active until the port is completed, and have the current account number, billing name, service address, and transfer PIN available.`;
}

function wifiAnswer(context = {}) {
  const recommendation = context.recommendation;
  const name = recommendation ? providerName(recommendation) : "your selected provider";
  const devices = Number(context.needs?.devices || 0);
  const deviceAdvice = devices >= 20 ? "With your device count, whole-home mesh Wi-Fi or multiple access points may be appropriate." : "Router placement and home size will determine whether a single gateway is enough.";
  return `${name} may include or offer Wi-Fi equipment depending on the plan. ${deviceAdvice} Equipment price and whole-home coverage options are confirmed with the final plan.`;
}

export function answerKnowledgeQuestion(message = "", context = {}) {
  const normalized = normalize(message);
  const providers = context.providers || [];
  const mentioned = findMentionedProvider(message, providers);

  // Resolve explicit customer-service intents before provider-name matching.
  // Provider names can contain generic words such as "Phone" or "Internet".
  if (/keep.*number|port.*number|phone number|number port/.test(normalized)) return portingAnswer(context);
  if (/contract|agreement|cancel|termination/.test(normalized)) return contractAnswer(context);
  if (/install|installation|technician|appointment/.test(normalized)) return installationAnswer(context);
  if (/router|wifi|wi fi|equipment|mesh|coverage/.test(normalized)) return wifiAnswer(context);
  if (/price|cost|monthly|fee|tax|promotion|promo/.test(normalized)) return priceAnswer(context);
  if (/fiber.*cable|cable.*fiber/.test(normalized)) {
    return "Fiber generally provides stronger upload performance, lower latency, and more consistent capacity. Cable is often widely available with strong download speeds, but upload speeds are usually lower and peak-time performance can vary. The better choice depends on the verified options and your household priorities.";
  }
  if (/why not|instead of|compare|difference|versus| vs /.test(` ${normalized} `)) return compareAnswer(mentioned, context);
  if (/why.*recommend|why.*best|why.*choose|recommendation/.test(normalized)) return recommendationAnswer(context);
  if (mentioned) return compareAnswer(mentioned, context);
  if (/gaming|latency|lag/.test(normalized)) return bestForAnswer("gaming", context);
  if (/work from home|remote work|zoom|teams|upload/.test(normalized)) return bestForAnswer("remote work", context);
  if (/stream|4k|television| tv /.test(` ${normalized} `)) return bestForAnswer("streaming", context);
  if (/switch|current provider|disconnect/.test(normalized)) return "Keep your current service active until the new connection is installed and tested. After the new service works correctly, confirm any equipment-return and cancellation requirements with the old provider.";

  if (context.recommendation) {
    return `${providerSummary(context.recommendation)} It is currently the top ConnectIQ match for ${householdReason(context.needs)}. Ask me about price, installation, Wi-Fi, contracts, phone-number transfers, gaming, remote work, or why another provider ranked lower.`;
  }
  return "I can help with availability, provider comparisons, speed, pricing, installation, equipment, contracts, phone-number transfers, and switching providers. Complete the address check for a personalized answer.";
}

export function answerCommonQuestion(message = "", context = {}) {
  return answerKnowledgeQuestion(message, context);
}

export { TECHNOLOGY_KNOWLEDGE };
