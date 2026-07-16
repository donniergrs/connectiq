function clean(value) {
  return String(value || "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function providerName(provider = {}) {
  return provider.displayName || provider.name || provider.brandName || provider.providerName || "Available Provider";
}

function selectedNeeds(needs = {}) {
  return [
    ["workFromHome", "Remote work"],
    ["streaming", "Streaming"],
    ["gaming", "Gaming"],
    ["creator", "Large uploads"],
    ["reliability", "Maximum reliability"],
  ].filter(([key]) => Boolean(needs[key])).map(([, label]) => label);
}

function readinessScore({ customer = {}, address = "", recommendation = {}, quote = {}, needs = {} } = {}) {
  let score = 0;
  if (clean(customer.name)) score += 10;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(customer.email))) score += 10;
  if (clean(customer.phone).replace(/\D/g, "").length >= 10) score += 10;
  if (customer.consent) score += 10;
  if (clean(address)) score += 10;
  if (recommendation && Object.keys(recommendation).length) score += 15;
  if (quote && Object.keys(quote).length) score += 15;
  if (number(needs.people) > 0) score += 5;
  if (number(needs.devices) > 0) score += 5;
  if (clean(needs.priority)) score += 5;
  if (number(needs.budget) > 0) score += 5;
  return Math.min(100, score);
}

function readinessLabel(score) {
  if (score >= 90) return "Ready for Advisor";
  if (score >= 75) return "Qualified — Verify Offer";
  if (score >= 55) return "Needs Follow-up";
  return "Needs More Information";
}

function opportunityLevel({ readiness, recommendation = {}, needs = {}, quote = {} }) {
  const match = number(recommendation.advisorScore || quote.advisorScore);
  const budget = number(needs.budget);
  const price = number(quote.monthlyPrice || quote.pricing?.amount);
  if (readiness >= 90 && match >= 85 && (!budget || !price || price <= budget * 1.15)) return "High Opportunity";
  if (readiness >= 75 && match >= 70) return "Medium Opportunity";
  return "Needs Follow-up";
}

function likelyObjection(needs = {}, quote = {}) {
  const budget = number(needs.budget);
  const price = number(quote.monthlyPrice || quote.pricing?.amount);
  if (budget && price > budget) return "Monthly cost exceeds the stated target";
  if (String(needs.priority).toLowerCase() === "price") return "Price sensitivity and promotion expectations";
  if (needs.reliability || needs.workFromHome) return "Concern about reliability during the switch or installation";
  return "Final provider pricing and installation timing";
}

function sellingPoint(needs = {}, recommendation = {}, quote = {}) {
  if (needs.workFromHome) return `Emphasize ${quote.upload || recommendation.upload || "strong"} Mbps upload capacity and remote-work reliability.`;
  if (needs.gaming) return "Emphasize low-latency technology, household headroom, and consistent performance during peak use.";
  if (needs.streaming) return "Emphasize simultaneous streaming capacity and room for other connected devices.";
  if (String(needs.priority).toLowerCase() === "price") return "Lead with total value, right-sized plan selection, and verification of current promotions.";
  return `Lead with the ${recommendation.recommendationTier || "strong"} household match and transparent provider comparison.`;
}

function recommendedNextAction(score) {
  if (score >= 90) return "Advisor contact and provider-offer verification";
  if (score >= 75) return "Verify pricing, plan availability, and installation options";
  return "Collect missing qualification details before provider submission";
}

function conversationSummary(conversation = [], needs = {}) {
  const customerQuestions = conversation
    .filter((message) => message?.role === "customer")
    .map((message) => clean(message.text))
    .filter(Boolean)
    .slice(-3);
  const usage = selectedNeeds(needs);
  const parts = [];
  if (usage.length) parts.push(`Customer priorities include ${usage.join(", ")}.`);
  if (clean(needs.priority)) parts.push(`Primary decision factor: ${clean(needs.priority)}.`);
  if (number(needs.budget)) parts.push(`Target budget: about $${number(needs.budget)} per month.`);
  if (customerQuestions.length) parts.push(`Recent questions: ${customerQuestions.join(" | ")}.`);
  return parts.join(" ") || "Customer completed the guided qualification flow and requested an internet recommendation.";
}

function recommendationSummary({ recommendation = {}, quote = {}, needs = {} }) {
  const provider = providerName(recommendation);
  const plan = quote.recommendedPlan?.name || quote.productName || "recommended plan";
  const reasons = (quote.reasons || recommendation.recommendationReasons || []).filter(Boolean).slice(0, 2);
  const usage = selectedNeeds(needs);
  const reasonText = reasons.length ? reasons.join(" ") : `It is the strongest verified fit for ${usage.join(", ") || "the household profile"}.`;
  return `${provider} ${plan} is the recommended option. ${reasonText}`;
}

function nextBestProvider(providers = [], recommendation = {}) {
  const currentId = recommendation.id || recommendation.providerId || providerName(recommendation);
  return providers.find((provider) => (provider.id || provider.providerId || providerName(provider)) !== currentId) || null;
}

export function buildSalesSummary({ customer = {}, address = "", providers = [], recommendation = {}, quote = {}, needs = {}, conversation = [] } = {}) {
  const generatedAt = new Date().toISOString();
  const readiness = readinessScore({ customer, address, recommendation, quote, needs });
  const alternative = nextBestProvider(providers, recommendation);
  const usage = selectedNeeds(needs);
  const summaryId = globalThis.crypto?.randomUUID?.() || `summary-${Date.now()}`;
  const summary = {
    summaryVersion: "3D-4.0",
    summaryId,
    generatedAt,
    customer: {
      name: clean(customer.name),
      email: clean(customer.email).toLowerCase(),
      phone: clean(customer.phone),
      consent: Boolean(customer.consent),
      serviceAddress: clean(address),
    },
    household: {
      people: number(needs.people),
      devices: number(needs.devices),
      budget: number(needs.budget),
      priority: clean(needs.priority) || "reliability",
      usage,
    },
    recommendation: {
      provider: providerName(recommendation),
      providerId: recommendation.id || recommendation.providerId || "",
      technology: recommendation.technology || recommendation.technologyType || quote.technology || "Broadband",
      plan: quote.recommendedPlan?.name || quote.productName || "",
      download: number(quote.download || recommendation.download),
      upload: number(quote.upload || recommendation.upload),
      matchScore: number(recommendation.advisorScore || quote.advisorScore),
      confidence: number(recommendation.confidence),
      reasons: (quote.reasons || recommendation.recommendationReasons || []).filter(Boolean).slice(0, 4),
      summary: recommendationSummary({ recommendation, quote, needs }),
      nextBest: alternative ? {
        provider: providerName(alternative),
        matchScore: number(alternative.advisorScore),
        technology: alternative.technology || alternative.technologyType || "Broadband",
      } : null,
    },
    quote: {
      quoteId: quote.quoteId || "",
      quoteVersion: quote.quoteVersion || "",
      status: quote.status || "Estimate",
      monthlyPrice: number(quote.monthlyPrice || quote.pricing?.amount),
      pricingSource: quote.pricing?.sourceLabel || "Planning estimate",
      estimatedFirstMonth: number(quote.estimatedFirstMonth),
      installationMethod: quote.installation?.method || "Provider confirmation required",
      installationWindow: quote.installation?.estimatedWindow || "Provider confirmation required",
      disclaimer: quote.disclaimer || quote.pricing?.disclaimer || "Final pricing and availability require provider confirmation.",
    },
    conversation: {
      messageCount: conversation.length,
      summary: conversationSummary(conversation, needs),
    },
    advisorNotes: {
      leadQuality: opportunityLevel({ readiness, recommendation, needs, quote }),
      readinessScore: readiness,
      readinessStatus: readinessLabel(readiness),
      likelyObjection: likelyObjection(needs, quote),
      primarySellingPoint: sellingPoint(needs, recommendation, quote),
      suggestedTalkingPoints: [
        `Confirm current pricing and promotion eligibility for ${providerName(recommendation)}.`,
        `Review ${quote.installation?.method || "installation"} expectations and scheduling availability.`,
        customer.phone ? "Confirm the best time and channel for advisor follow-up." : "Collect a valid phone number before outreach.",
      ],
      nextAction: recommendedNextAction(readiness),
    },
  };

  return {
    ...summary,
    exportPayload: {
      schema: "connectiq.sales-summary.v1",
      generatedAt,
      summaryId,
      customer: summary.customer,
      household: summary.household,
      recommendation: summary.recommendation,
      quote: summary.quote,
      conversation: summary.conversation,
      advisorNotes: summary.advisorNotes,
      leadStatus: summary.advisorNotes.readinessStatus,
      leadQuality: summary.advisorNotes.leadQuality,
      nextAction: summary.advisorNotes.nextAction,
    },
  };
}
