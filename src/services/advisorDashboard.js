const CLOSED_STATUSES = new Set(["Sale Closed", "Sold", "Installed", "Commission Paid"]);
const READY_STATUSES = new Set(["Ready to Submit", "Ready for Advisor", "Qualified — Verify Offer"]);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function providerName(lead = {}) {
  const best = Array.isArray(lead.providers) ? lead.providers[0] : null;
  return (
    lead.salesSummary?.recommendation?.provider ||
    lead.recommendationSnapshot?.displayName ||
    lead.recommendationSnapshot?.name ||
    lead.recommendedProvider ||
    best?.displayName ||
    best?.name ||
    "Recommendation pending"
  );
}

export function planName(lead = {}) {
  return (
    lead.salesSummary?.recommendation?.plan ||
    lead.quote?.recommendedPlan?.name ||
    lead.quote?.productName ||
    "Plan pending"
  );
}

export function monthlyPrice(lead = {}) {
  return number(
    lead.salesSummary?.quote?.monthlyPrice ??
    lead.quote?.monthlyPrice ??
    lead.quote?.pricing?.amount ??
    lead.estimatedMonthlyPrice
  );
}

export function readinessScore(lead = {}) {
  return number(lead.readinessScore ?? lead.salesSummary?.advisorNotes?.readinessScore);
}

export function leadQuality(lead = {}) {
  return lead.leadQuality || lead.salesSummary?.advisorNotes?.leadQuality || "Needs Review";
}

export function nextAction(lead = {}) {
  return lead.nextAction || lead.salesSummary?.advisorNotes?.nextAction || "Review lead details";
}

export function leadStatus(lead = {}) {
  return lead.status || lead.readinessStatus || lead.salesSummary?.advisorNotes?.readinessStatus || "New Lead";
}

export function createdAt(lead = {}) {
  return asDate(lead.createdAt) || asDate(lead.updatedAt);
}

export function isToday(value, now = new Date()) {
  const date = asDate(value);
  return Boolean(date) && date.toDateString() === now.toDateString();
}

export function isReadyToCall(lead = {}) {
  const status = leadStatus(lead);
  return READY_STATUSES.has(status) || readinessScore(lead) >= 85;
}

export function isClosedLead(lead = {}) {
  return CLOSED_STATUSES.has(leadStatus(lead));
}

export function projectedCommission(lead = {}) {
  const best = Array.isArray(lead.providers) ? lead.providers[0] : null;
  return number(
    lead.salesSummary?.advisorNotes?.projectedCommission ??
    lead.recommendationSnapshot?.commission ??
    best?.revenueProduct?.commission ??
    best?.commissionResidential ??
    best?.commission ??
    0
  );
}

export function normalizeLead(lead = {}) {
  const date = createdAt(lead);
  return {
    ...lead,
    provider: providerName(lead),
    plan: planName(lead),
    monthlyPrice: monthlyPrice(lead),
    readiness: readinessScore(lead),
    quality: leadQuality(lead),
    action: nextAction(lead),
    currentStatus: leadStatus(lead),
    createdDate: date,
    commission: projectedCommission(lead),
  };
}

export function buildAdvisorDashboard(leads = [], now = new Date()) {
  const normalized = leads.map(normalizeLead);
  const today = normalized.filter((lead) => isToday(lead.createdDate, now));
  const ready = normalized.filter(isReadyToCall);
  const quoted = normalized.filter((lead) => Boolean(lead.quote || lead.salesSummary?.quote?.monthlyPrice));
  const submitted = normalized.filter((lead) => ["Ready to Submit", "Order Submitted", "Submitted"].includes(lead.currentStatus));
  const closed = normalized.filter(isClosedLead);
  const projected = normalized.reduce((sum, lead) => sum + lead.commission, 0);
  const averageReadiness = normalized.length
    ? Math.round(normalized.reduce((sum, lead) => sum + lead.readiness, 0) / normalized.length)
    : 0;

  const priorityQueue = [...normalized]
    .sort((a, b) => {
      const qualityOrder = { "High Opportunity": 3, "Medium Opportunity": 2, "Needs Follow-up": 1, "Needs Review": 0 };
      const qualityDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
      if (qualityDiff) return qualityDiff;
      if (b.readiness !== a.readiness) return b.readiness - a.readiness;
      return (b.createdDate?.getTime?.() || 0) - (a.createdDate?.getTime?.() || 0);
    })
    .slice(0, 10);

  const providerMix = Object.entries(normalized.reduce((counts, lead) => {
    counts[lead.provider] = (counts[lead.provider] || 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    metrics: {
      total: normalized.length,
      today: today.length,
      readyToCall: ready.length,
      quotesGenerated: quoted.length,
      ordersSubmitted: submitted.length,
      closed: closed.length,
      projectedCommission: projected,
      averageReadiness,
    },
    priorityQueue,
    providerMix,
  };
}
