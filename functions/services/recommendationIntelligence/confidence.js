import { profileMissingInformation } from "./profileBuilder.js";

export function calculateConfidence({ profile = {}, rankedProviders = [] } = {}) {
  const missing = profileMissingInformation(profile);
  const eligible = rankedProviders.filter((item) => item.eligible);
  const top = eligible[0];
  const second = eligible[1];
  let score = 58;
  score += Math.max(0, 20 - missing.length * 6);
  if (profile.currentProvider) score += 5;
  if (profile.monthlyBill) score += 4;
  if (profile.painPoints?.length || profile.goals?.length) score += 5;
  if (eligible.length > 0) score += 4;
  const margin = top && second ? top.finalScore - second.finalScore : top ? 12 : 0;
  score += Math.min(8, Math.max(0, margin));
  score = Math.max(35, Math.min(98, Math.round(score)));
  return {
    score,
    level: score >= 85 ? "High" : score >= 70 ? "Medium" : "Low",
    missingInformation: missing,
    needsFollowUp: score < 70 || missing.length >= 3,
    scoreMargin: Math.round(margin * 10) / 10,
  };
}
