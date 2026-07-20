function nameOf(p = {}) { return p.displayName || p.brand_name || p.provider_name || p.name || "that provider"; }
function normalize(v = "") { return String(v).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function findMentioned(message, providers) {
  const text = normalize(message);
  return providers.find((provider) => text.includes(normalize(nameOf(provider)))) || null;
}

export function composeFallback({ message, memory = {}, providers = [], plan = {} }) {
  const current = memory.facts?.currentProvider;
  const bill = memory.facts?.monthlyBill;
  const mentioned = findMentioned(message, providers);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  const candidates = providers.filter((p) => normalize(nameOf(p)) !== normalize(current) && !rejected.has(normalize(nameOf(p))));
  const top = mentioned || candidates[0];
  const topName = top ? nameOf(top) : null;

  if (plan.action === "answer_reliability") {
    const tech = String(top?.technology || top?.technologyType || top?.technology_code_type || "").toLowerCase();
    const basis = tech.includes("fiber") ? "Fiber is generally well suited to remote work because it typically supports strong upload performance and low latency." : "Actual reliability can vary by local network conditions and the service installed at the address.";
    return `${topName || "That provider"} may be a solid option, but I do not have verified uptime statistics for this exact address. ${basis} I can compare it with the other available options without making an unsupported promise.`;
  }
  if (plan.action === "answer_pricing" || plan.action === "explain_quote") {
    const price = Number(top?.price || top?.monthlyPrice || top?.estimatedMonthlyPrice || 0);
    if (price > 0) return `${topName} is currently estimated at about $${price} per month before any final taxes, equipment, installation, or promotional terms are confirmed. ${bill ? `That is roughly $${Math.abs(bill-price)} ${price < bill ? "less" : "more"} than the $${bill} you pay now.` : ""}`.trim();
    return `I do not have a verified address-specific price for ${topName || "that option"} yet, so I will not invent one. I can still prepare the quote request and compare its technology and expected fit with your current service${bill ? ` at $${bill} per month` : ""}.`;
  }
  if (plan.action === "reject_and_rerank" || plan.action === "compare_alternatives") {
    if (!candidates.length) return "I have removed that provider from consideration. I do not yet have another verified option to recommend, so the next step is to refresh availability for the address.";
    return `Understood. I removed that provider from consideration. ${nameOf(candidates[0])} is now the leading remaining option, and ${candidates.slice(1,3).map(nameOf).join(" and ") || "the other verified providers"} remain available to compare.`;
  }
  if (current || bill || memory.householdNeeds?.length) {
    const summary = [current && `you currently use ${current}`, bill && `pay about $${bill} per month`, memory.householdNeeds?.includes("workFromHome") && "work from home"].filter(Boolean).join(", ");
    return `Thanks—that helps. I understand that ${summary}. I’ll use those details rather than asking you to repeat them. ${topName ? `${topName} is the leading remaining option based on the address results, but I’ll answer your next question directly before moving the sale forward.` : "What matters most now: lowering the bill, improving reliability, or both?"}`;
  }
  return "I’m following the conversation and will answer your question directly. Tell me what you want to compare first: price, reliability, speed, or installation.";
}
