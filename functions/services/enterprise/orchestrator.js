import { answerFromUniversity } from "../university/index.js";

function nameOf(provider = {}) {
  return provider.name || provider.provider_name || provider.brand_name || provider.holding_company_name || "";
}
function technologyOf(provider = {}) {
  return String(provider.technology || provider.technology_code_type || provider.tech || "").toLowerCase();
}
function normalize(value = "") {
  return String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}
function sameProvider(a, b) {
  const left = normalize(typeof a === "string" ? a : nameOf(a));
  const right = normalize(typeof b === "string" ? b : nameOf(b));
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}
function detectDecisionIntent(message = "") {
  const text = String(message).toLowerCase();
  if (/\b(i don'?t want|do not want|exclude|remove|not interested in|anything but)\b/.test(text)) return "reject_provider";
  if (/\b(show|give|what are).*(alternative|other option)|\balternatives?\b|\bother providers?\b/.test(text)) return "alternatives";
  if (/\b(best|recommend|which one|which provider|what should i choose)\b/.test(text)) return "recommendation";
  if (/\b(work from home|remote work|lower my bill|save money|gaming|streaming|reliable|wifi|wi-fi)\b/.test(text)) return "needs_analysis";
  if (/\b(quote|build my quote|sign me up|order)\b/.test(text)) return "quote";
  return "knowledge";
}
function mentionedProvider(message, providers = []) {
  return providers.find((provider) => normalize(message).includes(normalize(nameOf(provider)))) || null;
}
function scoreProvider(provider, customer = {}) {
  const tech = technologyOf(provider);
  let score = 40;
  const reasons = [];
  if (/fiber|fttp|ftth/.test(tech)) {
    score += 30;
    reasons.push("fiber technology");
  } else if (/cable/.test(tech)) {
    score += 16;
    reasons.push("widely available cable service");
  } else if (/fixed wireless|wireless/.test(tech)) {
    score += 8;
    reasons.push("wireless installation flexibility");
  }
  if (customer.workFromHome && /fiber/.test(tech)) {
    score += 18;
    reasons.push("strong upload and latency characteristics for remote work");
  }
  if (customer.preferences?.includes("price")) {
    score += Number(provider.monthlyPrice || provider.price || 0) > 0 ? Math.max(0, 15 - Number(provider.monthlyPrice || provider.price) / 10) : 3;
  }
  const down = Number(provider.maxdown || provider.maxDownloadMbps || provider.downloadMbps || 0);
  const up = Number(provider.maxup || provider.maxUploadMbps || provider.uploadMbps || 0);
  if (down >= 1000) score += 8;
  if (up >= 500) score += 8;
  if (provider.lowlatency === true || provider.lowLatency === true) score += 5;
  return { provider, score, reasons: [...new Set(reasons)] };
}
function rankEligibleProviders(providers, memory) {
  const current = memory?.facts?.currentProvider || "";
  const rejected = memory?.rejectedProviders || [];
  const customer = {
    workFromHome: memory?.householdNeeds?.includes("workFromHome"),
    preferences: memory?.preferences || [],
  };
  return providers
    .filter((provider) => {
      const name = nameOf(provider);
      return name && !sameProvider(name, current) && !rejected.some((item) => sameProvider(name, item));
    })
    .map((provider) => scoreProvider(provider, customer))
    .sort((a, b) => b.score - a.score);
}
function describeOption(item) {
  const providerName = nameOf(item.provider);
  const tech = technologyOf(item.provider);
  const reason = item.reasons.slice(0, 2).join(" and ") || `${tech || "available"} service at the address`;
  return `${providerName} (${tech || "technology to verify"}) — ${reason}`;
}

export function orchestrateEnterpriseResponse({ message, routerResult, providers = [], selectedProvider } = {}) {
  const memory = routerResult?.memory || {};
  const decisionIntent = detectDecisionIntent(message);
  const mentioned = mentionedProvider(message, providers);
  const ranked = rankEligibleProviders(providers, memory);
  const selectedName = typeof selectedProvider === "string" ? selectedProvider : nameOf(selectedProvider || {});
  const active = ranked.find((item) => sameProvider(nameOf(item.provider), selectedName)) || ranked[0] || null;
  const customer = { ...(memory.facts || {}), workFromHome: memory.householdNeeds?.includes("workFromHome"), gaming: memory.householdNeeds?.includes("gaming") };

  let response;
  let action = "answer_question";
  if (decisionIntent === "reject_provider") {
    const rejectedName = mentioned ? nameOf(mentioned) : selectedName;
    const alternatives = ranked.filter((item) => !sameProvider(nameOf(item.provider), rejectedName)).slice(0, 3);
    if (alternatives.length) {
      response = `Understood. I removed ${rejectedName || "that provider"} from consideration. Your strongest remaining option is ${nameOf(alternatives[0].provider)} because ${alternatives[0].reasons.slice(0, 2).join(" and ") || "it is the best remaining match for the needs you shared"}. Other available choices include ${alternatives.slice(1).map(describeOption).join("; ") || "no additional verified options in the current list"}.`;
      action = "recalculate_recommendation";
    } else {
      response = `Understood. I removed ${rejectedName || "that provider"} from consideration. I do not have another eligible provider in the current address results, so I should verify the provider list before recommending anything else.`;
      action = "verify_availability";
    }
  } else if (decisionIntent === "alternatives") {
    const alternatives = ranked.slice(0, 3);
    response = alternatives.length
      ? `Here are the strongest alternatives from the providers found at your address: ${alternatives.map(describeOption).join("; ")}. I would start with ${nameOf(alternatives[0].provider)} based on the needs you shared.`
      : "I do not have an eligible alternative in the current provider list. I should verify the address results rather than guess.";
    action = "present_alternatives";
  } else if (decisionIntent === "recommendation" || decisionIntent === "needs_analysis") {
    if (active) {
      const billContext = memory.facts?.monthlyBill ? ` You currently pay about $${memory.facts.monthlyBill} per month, so exact savings require a verified address-specific quote.` : "";
      response = `${nameOf(active.provider)} is the leading option from the current address results because ${active.reasons.slice(0, 3).join(", ") || "it best matches the needs you shared"}.${billContext}`;
      action = "present_recommendation";
    }
  }

  if (!response) {
    const providerName = mentioned ? nameOf(mentioned) : selectedName || (active ? nameOf(active.provider) : "");
    const university = answerFromUniversity({ message, providerName, customer });
    response = university.answer;
    return {
      message: response,
      intent: university.intent,
      grounded: university.grounded,
      confidence: university.confidence,
      providerName: providerName || null,
      selectedProvider: active ? nameOf(active.provider) : providerName || null,
      rankedProviders: ranked.map((item) => ({ name: nameOf(item.provider), score: item.score, reasons: item.reasons })),
      decision: { action, reason: "Knowledge response selected after orchestration evaluation." },
      citations: [
        ...(university.knowledge.provider ? [{ type: "provider", id: university.knowledge.provider.id, title: university.knowledge.provider.name }] : []),
        ...university.knowledge.articles.map((item) => ({ type: "article", id: item.id, title: item.title })),
      ],
      nextBestAction: routerResult?.orchestration?.nextBestAction || null,
    };
  }

  return {
    message: response,
    intent: decisionIntent,
    grounded: true,
    confidence: active ? 0.82 : 0.65,
    providerName: active ? nameOf(active.provider) : null,
    selectedProvider: active ? nameOf(active.provider) : null,
    rankedProviders: ranked.map((item) => ({ name: nameOf(item.provider), score: item.score, reasons: item.reasons })),
    decision: { action, reason: `Orchestrator selected ${action} after evaluating customer memory, provider exclusions, and address-level options.` },
    citations: [],
    nextBestAction: routerResult?.orchestration?.nextBestAction || null,
  };
}
