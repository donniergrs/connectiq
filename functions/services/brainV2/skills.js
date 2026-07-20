function nameOf(p) { return p?.displayName || p?.brand_name || p?.provider_name || p?.name || "Provider"; }
function norm(v="") { return String(v).toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"").replace(/^att$/, "atandt").replace(/^comcast$/, "xfinity"); }
function techOf(p) { return p?.technology || p?.technologyType || p?.technology_code_type || "broadband"; }
function priceOf(p) { const n = Number(p?.price || p?.monthlyPrice || p?.estimatedMonthlyPrice || 0); return n > 0 ? n : null; }

export function eligibleProviders(providers=[], currentProvider=null) {
  const current = norm(currentProvider);
  return providers.filter(p => !current || norm(nameOf(p)) !== current);
}

export function chooseProvider(providers=[], memory={}) {
  const options = eligibleProviders(providers, memory.facts?.currentProvider);
  if (!options.length) return null;
  const budget = Number(memory.facts?.monthlyBudget || 0);
  const scored = options.map((p,index) => {
    const tech = techOf(p).toLowerCase();
    const price = priceOf(p);
    let score = 100-index;
    if (/fiber/.test(tech)) score += 30;
    if ((memory.householdNeeds||[]).includes("workFromHome") && /fiber/.test(tech)) score += 20;
    if ((memory.painPoints||[]).includes("wifiCoverage")) score += 5;
    if (budget && price && price <= budget) score += 25;
    if (budget && price && price > budget) score -= 25;
    return { p, score };
  }).sort((a,b)=>b.score-a.score);
  return scored[0].p;
}

export function executeSkill({ intent, memory, providers, quote }) {
  const provider = chooseProvider(providers, memory);
  const providerName = provider ? nameOf(provider) : null;
  const current = memory.facts?.currentProvider;
  const alternatives = eligibleProviders(providers, current).slice(0,4).map(nameOf);
  const providerPrice = provider ? priceOf(provider) : null;

  switch (intent) {
    case "pricing":
      return providerPrice
        ? { skill:"PricingSkill", answer:`${providerName} is estimated at about $${providerPrice} per month. Final pricing, promotions, equipment, taxes, and installation must still be confirmed.`, followUp:"Would you like me to compare that estimate with your current bill?" }
        : { skill:"PricingSkill", answer:`I do not have a verified monthly price for ${providerName || "that provider"} yet. I can compare availability and performance now, but I will not invent a price.`, followUp:"Would you like a quote request prepared for exact pricing?" };
    case "mobile":
      return { skill:"MobileSkill", answer:"ConnectIQ can help compare internet providers that may also offer mobile service or bundle discounts. Mobile availability and pricing must be verified for the specific provider and address.", followUp:"Should I include mobile bundle eligibility in your comparison?" };
    case "installation":
      return { skill:"InstallationSkill", answer:"Installation timing depends on the provider, address, and whether the location already has active service. I can preserve your selection and request the earliest verified appointment before an order is submitted.", followUp:"Would you like me to prepare the installation details for your leading option?" };
    case "alternatives":
      return { skill:"ComparisonSkill", answer: alternatives.length ? `Your strongest alternatives to ${current || "your current provider"} are ${alternatives.join(", ")}. ${providerName ? `${providerName} currently ranks first based on your stated needs.` : "I need more verified provider data to rank them."}` : "I do not have a verified alternative provider at this address yet.", followUp:"Would you like price, speed, or reliability compared first?" };
    case "explanation": {
      const reasons=[];
      if ((memory.preferences||[]).includes("price")) reasons.push("lower monthly cost is your top priority");
      if ((memory.householdNeeds||[]).includes("workFromHome")) reasons.push("you work from home and need dependable service");
      if ((memory.householdNeeds||[]).includes("streaming")) reasons.push("your household streams frequently");
      if ((memory.painPoints||[]).includes("wifiCoverage")) reasons.push("you reported weak upstairs Wi-Fi coverage");
      if (/fiber/i.test(techOf(provider))) reasons.push("fiber is available from this option");
      return { skill:"ExplanationSkill", answer: providerName ? `${providerName} leads because ${reasons.length ? reasons.join(", ") : "it is the strongest verified alternative at your address"}. I have excluded ${current || "your current provider"} from the switch recommendation.` : "I do not yet have enough verified provider information to explain a recommendation.", followUp:"Would you like to see the alternatives or build a quote?" };
    }
    case "quote":
      return { skill:"QuoteSkill", answer: quote?.estimatedMonthlyPrice ? `I prepared an estimate for ${quote.provider} at about $${quote.estimatedMonthlyPrice} per month. Final pricing and fees still require provider confirmation.` : `I selected ${quote?.provider || providerName || "the leading alternative"} for the quote, but exact monthly pricing is not available yet. I can prepare the customer and service details for provider confirmation.`, followUp:"Would you like to continue to order details or compare another provider?" };
    case "human_handoff":
      return { skill:"HumanHandoffSkill", answer:"I will preserve the conversation and prepare it for a ConnectIQ advisor.", followUp:"What is the best phone number or email for follow-up?" };
    case "current_provider_correction":
      return { skill:"CorrectionSkill", answer:`Thanks for the correction. I updated your current provider to ${current}. I will exclude ${current} from switch recommendations. ${providerName ? `${providerName} is now the leading alternative.` : "I am reviewing the remaining alternatives."}`, followUp:"Would you like to compare price, speed, or reliability?" };
    case "recommendation":
      return { skill:"RecommendationSkill", answer: providerName ? `${providerName} is my leading alternative based on the verified providers at your address and the needs you shared.` : "I need verified provider availability before I can recommend an option.", followUp:"Would you like to know why it ranks first?" };
    case "discovery":
      return { skill:"DiscoverySkill", answer:"I captured the details you shared and will use them in the comparison rather than asking you to repeat them.", followUp: providerName ? `${providerName} is currently the leading alternative. Would you like pricing, the reason it ranks first, or other options?` : "What matters most: price, reliability, speed, or Wi-Fi coverage?" };
    default:
      return { skill:"GeneralQuestionSkill", answer:"I may not have enough verified information to answer that directly yet. I can help with pricing, mobile bundles, installation, provider comparisons, recommendations, and quotes.", followUp:"Which of those would you like to review?" };
  }
}
