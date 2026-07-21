const text = (value, fallback = "Not captured") => String(value ?? "").trim() || fallback;
const unique = (values = []) => [...new Set(values.filter(Boolean))];

export function buildAdvisorIntelligence(lead = {}) {
  const saved = lead.recommendationIntelligence || lead.aiRecommendation || {};
  const profile = saved.customerProfile || lead.customerProfile || lead.needs || {};
  const rec = saved.recommendation || lead.recommendationSnapshot || lead.salesSummary?.recommendation || {};
  const reasons = unique(rec.reasons || rec.recommendationReasons || saved.reasons || lead.quote?.reasons || []);
  const rejected = unique(profile.rejectedProviders || lead.rejectedProviders || []);
  const painPoints = unique(profile.painPoints || lead.painPoints || []);
  const goals = unique(profile.goals || lead.goals || []);
  const currentProvider = text(profile.currentProvider || lead.currentProvider || lead.existingProvider);
  const confidence = Number(rec.confidence ?? saved.confidence?.score ?? lead.recommendationConfidence ?? 0);
  const missing = saved.confidence?.missingInformation || saved.missingInformation || [];
  return {
    profile: {
      currentProvider,
      monthlyBill: Number(profile.monthlyBill || lead.monthlyBill || 0),
      contractStatus: text(profile.contractStatus, "Unknown"),
      workFromHome: Boolean(profile.workFromHome),
      gaming: Boolean(profile.gaming),
      streaming: Boolean(profile.streaming),
      reliabilityPriority: text(profile.reliabilityPriority, "Medium"),
      pricePriority: text(profile.pricePriority, "Medium"),
      speedPriority: text(profile.speedPriority, "Medium"),
      painPoints,
      goals,
      rejectedProviders: rejected,
    },
    recommendation: {
      provider: text(rec.providerName || rec.provider || lead.recommendedProvider, "Recommendation pending"),
      confidence,
      confidenceLevel: rec.confidenceLevel || saved.confidence?.level || (confidence >= 85 ? "High" : confidence >= 70 ? "Medium" : "Low"),
      reasons,
      customerFitScore: Number(rec.customerFitScore || 0),
      businessScore: Number(rec.businessScore || 0),
      finalScore: Number(rec.finalScore || rec.matchScore || 0),
    },
    missingInformation: missing,
    followUpQuestion: saved.followUpQuestion || null,
    version: saved.configuration?.version || "AI-007-v1.0.0",
  };
}
