import { mergeRecommendationConfig } from "./config.js";
import { normalizeProvider, scoreCustomerFit, scoreBusiness, qualification } from "./scoring.js";
import { recordRecommendation } from "./auditStore.js";

function customerExplanation(item, profile = {}) {
  const reasons = [];
  if (item.provider.technology === "fiber") reasons.push("fiber technology");
  if (item.provider.lowLatency) reasons.push("low-latency performance");
  if (item.provider.downloadMbps) reasons.push(`speeds up to ${item.provider.downloadMbps} Mbps`);
  if (profile.workFromHome && item.provider.uploadMbps) reasons.push(`upload capacity suited for video calls and remote work`);
  if (profile.gaming) reasons.push("a strong fit for gaming and connected devices");
  return `ConnectIQ recommends ${item.provider.name} based on ${reasons.slice(0,3).join(", ") || "the service characteristics available at this address"}.`;
}

export function evaluateRecommendations({ providers = [], customerProfile = {}, config: overrides = {}, context = {} } = {}) {
  if (!Array.isArray(providers) || providers.length === 0) throw new Error("providers must contain at least one provider.");
  const config = mergeRecommendationConfig(overrides);
  const evaluated = providers.map((raw, index) => {
    const provider = normalizeProvider(raw, index);
    const qualified = qualification(provider, customerProfile);
    const customerFit = scoreCustomerFit(provider, customerProfile, config);
    const business = scoreBusiness(provider, config);
    const finalScore = Math.round((business.score * config.weights.business + customerFit.score * config.weights.customerFit) * 10) / 10;
    const eligible = qualified.eligible && customerFit.score >= config.customerFitMinimum;
    return { provider, eligible, disqualificationReasons: [...qualified.reasons, ...(customerFit.score < config.customerFitMinimum ? [`Customer fit score ${customerFit.score} is below minimum ${config.customerFitMinimum}.`] : [])], customerFit, business, finalScore };
  }).sort((a,b) => Number(b.eligible)-Number(a.eligible) || b.finalScore-a.finalScore || b.customerFit.score-a.customerFit.score);
  const winner = evaluated.find(x=>x.eligible) || evaluated[0];
  const result = {
    ok: true,
    configuration: { version: config.version, weights: config.weights, customerFitMinimum: config.customerFitMinimum },
    recommendation: winner ? { providerId: winner.provider.id, providerName: winner.provider.name, finalScore: winner.finalScore, customerFitScore: winner.customerFit.score, businessScore: winner.business.score, explanation: customerExplanation(winner, customerProfile) } : null,
    rankedProviders: evaluated,
  };
  result.audit = recordRecommendation({ context, customerProfile, configuration: result.configuration, providersConsidered: evaluated.map(x=>({providerId:x.provider.id, providerName:x.provider.name, eligible:x.eligible, customerFitScore:x.customerFit.score, businessScore:x.business.score, finalScore:x.finalScore})), selectedProviderId: result.recommendation?.providerId || null, explanation: result.recommendation?.explanation || null });
  return result;
}
