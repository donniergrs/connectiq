function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function providerKey(provider = {}) {
  return String(provider.id || provider.providerId || provider.displayName || provider.name || "").toLowerCase();
}

export function quoteMatchLabel(score = 0) {
  const normalized = number(score);
  if (normalized >= 95) return "Excellent match";
  if (normalized >= 85) return "Strong match";
  if (normalized >= 70) return "Good match";
  return "Best available fit";
}

export function findNextBestProvider(providers = [], recommendation = {}) {
  const selectedKey = providerKey(recommendation);
  return providers.find((provider) => providerKey(provider) !== selectedKey) || null;
}

export function buildQuoteTradeoffs({ quote, recommendation, nextBest, needs = {} } = {}) {
  const strengths = Array.isArray(quote?.reasons) ? quote.reasons.filter(Boolean).slice(0, 4) : [];
  const tradeoffs = [];

  if (quote?.pricing?.estimated) {
    tradeoffs.push("Monthly pricing is an estimate until the provider confirms the current offer.");
  }
  if (quote?.installation?.disclaimer) {
    tradeoffs.push(quote.installation.disclaimer);
  }
  if (nextBest) {
    const recommendedUpload = number(recommendation?.upload ?? quote?.upload);
    const alternativeUpload = number(nextBest?.upload ?? nextBest?.maxup);
    const recommendedDownload = number(recommendation?.download ?? quote?.download);
    const alternativeDownload = number(nextBest?.download ?? nextBest?.maxdown);

    if (recommendedUpload > alternativeUpload) {
      tradeoffs.push(`${recommendation.displayName || quote?.provider} offers more upload capacity than ${nextBest.displayName || nextBest.name}.`);
    } else if (alternativeDownload > recommendedDownload) {
      tradeoffs.push(`${nextBest.displayName || nextBest.name} may advertise a higher maximum download speed, but the recommendation better matches your stated priorities.`);
    } else {
      tradeoffs.push(`${nextBest.displayName || nextBest.name} remains a viable alternative if its final verified price is lower.`);
    }
  }
  if (needs?.priority === "price") {
    tradeoffs.push("A lower-speed tier may reduce cost, but it could provide less headroom for future devices.");
  }

  return {
    strengths: strengths.length ? strengths : ["This plan is sized to the household profile you provided."],
    tradeoffs: [...new Set(tradeoffs)].slice(0, 4),
  };
}
