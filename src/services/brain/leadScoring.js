export function calculateLeadScore({ customer = {}, providers = [], recommendation = null, needs = {} } = {}) {
  let score = 35;
  const timelinePoints = { today: 30, week: 22, month: 12, comparing: 4 };
  score += timelinePoints[customer.buyingTimeline] || 0;
  const prefs = customer.contactPreferences || {};
  score += [prefs.text, prefs.phone, prefs.email].filter(Boolean).length * 6;
  if (customer.futureOffersOptIn) score += 4;
  if (providers.length) score += 5;
  if (recommendation) score += 5;
  if (needs.people && needs.devices && needs.priority) score += 5;
  score = Math.min(100, score);
  let label = "Long-Term Opportunity";
  let priority = "Nurture";
  if (score >= 90) { label = "Ready Now"; priority = "High"; }
  else if (score >= 75) { label = "Strong Opportunity"; priority = "High"; }
  else if (score >= 60) { label = "Good Prospect"; priority = "Normal"; }
  return { score, label, priority };
}

export function buildConsentSnapshot(customer = {}) {
  return {
    version: "connectiq-contact-consent-v1",
    accepted: Boolean(customer.consent),
    methods: {
      text: Boolean(customer.contactPreferences?.text),
      phone: Boolean(customer.contactPreferences?.phone),
      email: Boolean(customer.contactPreferences?.email),
    },
    futureOffers: Boolean(customer.futureOffersOptIn),
    capturedAt: new Date().toISOString(),
  };
}
