import { mergeRecommendationConfig } from "./config.js";
import { normalizeProvider, scoreCustomerFit, scoreBusiness, qualification } from "./scoring.js";
import { recordRecommendation } from "./auditStore.js";
import { buildCustomerProfile } from "./profileBuilder.js";
import { calculateConfidence } from "./confidence.js";
import { buildRecommendationReasons, nextQuestion } from "./reasoning.js";

const sameProvider = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export function evaluateRecommendations({ providers = [], customerProfile = {}, lead = {}, config: overrides = {}, context = {} } = {}) {
  if (!Array.isArray(providers) || providers.length === 0) throw new Error("providers must contain at least one provider.");
  const profile = buildCustomerProfile({ ...lead, customerProfile: { ...(lead.customerProfile || {}), ...customerProfile } });
  const config = mergeRecommendationConfig(overrides);
  const evaluated = providers.map((raw, index) => {
    const provider = normalizeProvider(raw, index);
    const qualified = qualification(provider, profile);
    const currentProviderExcluded = profile.currentProvider && sameProvider(profile.currentProvider, provider.name);
    const rejected = (profile.rejectedProviders || []).some((name) => sameProvider(name, provider.name));
    const customerFit = scoreCustomerFit(provider, profile, config);
    const business = scoreBusiness(provider, config);
    const finalScore = Math.round((business.score * config.weights.business + customerFit.score * config.weights.customerFit) * 10) / 10;
    const disqualificationReasons = [
      ...qualified.reasons,
      ...(currentProviderExcluded ? ["Current provider is excluded from the default recommendation."] : []),
      ...(rejected ? ["Customer rejected this provider."] : []),
      ...(customerFit.score < config.customerFitMinimum ? [`Customer fit score ${customerFit.score} is below minimum ${config.customerFitMinimum}.`] : []),
    ];
    const eligible = qualified.eligible && !currentProviderExcluded && !rejected && customerFit.score >= config.customerFitMinimum;
    return { provider, eligible, currentProviderExcluded, rejected, disqualificationReasons, customerFit, business, finalScore };
  }).sort((a,b) => Number(b.eligible)-Number(a.eligible) || b.finalScore-a.finalScore || b.customerFit.score-a.customerFit.score);
  const winner = evaluated.find((x) => x.eligible) || evaluated[0];
  const confidence = calculateConfidence({ profile, rankedProviders: evaluated });
  const reasons = buildRecommendationReasons(winner, profile);
  const result = {
    ok: true,
    customerProfile: profile,
    configuration: { version: "AI-007-v1.0.0", weights: config.weights, customerFitMinimum: config.customerFitMinimum },
    recommendation: winner ? {
      providerId: winner.provider.id, providerName: winner.provider.name, finalScore: winner.finalScore,
      customerFitScore: winner.customerFit.score, businessScore: winner.business.score,
      confidence: confidence.score, confidenceLevel: confidence.level, reasons,
      explanation: `ConnectIQ recommends ${winner.provider.name}. ${reasons.join(" ") || "It is the strongest eligible option based on verified availability and the customer profile."}`,
    } : null,
    confidence,
    followUpQuestion: confidence.needsFollowUp ? nextQuestion(confidence.missingInformation) : null,
    rankedProviders: evaluated,
  };
  result.audit = recordRecommendation({ context, customerProfile: profile, configuration: result.configuration, providersConsidered: evaluated.map(x=>({providerId:x.provider.id, providerName:x.provider.name, eligible:x.eligible, customerFitScore:x.customerFit.score, businessScore:x.business.score, finalScore:x.finalScore})), selectedProviderId: result.recommendation?.providerId || null, explanation: result.recommendation?.explanation || null });
  return result;
}
