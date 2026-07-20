function normalize(value = "") { return String(value).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function nameOf(provider = {}) { return provider.displayName || provider.brand_name || provider.provider_name || provider.name || "that provider"; }
function techOf(provider = {}) { return String(provider.technology || provider.technologyType || provider.technology_code_type || "").toLowerCase(); }
function mentionedProvider(message, providers = []) {
  const text = normalize(message);
  return providers.find((provider) => text.includes(normalize(nameOf(provider)))) || null;
}
function eligibleProviders(memory, providers) {
  const current = normalize(memory.facts?.currentProvider);
  const rejected = new Set((memory.rejectedProviders || []).map(normalize));
  return providers.filter((provider) => {
    const name = normalize(nameOf(provider));
    return name && name !== current && !rejected.has(name);
  });
}
function bestDiscoveryQuestion(memory) {
  if (!memory.facts?.monthlyBill) return "About how much are you paying each month now?";
  if (!(memory.preferences || []).length && !(memory.painPoints || []).length) return "What would you most like to improve—your monthly price, reliability, speed, or Wi-Fi coverage?";
  return "Would you like me to narrow this to the best-value option or the strongest overall service?";
}
export function composeSalesCloserFallback({ message, memory = {}, providers = [], quote = null }) {
  const text = String(message || "").trim();
  const current = memory.facts?.currentProvider;
  const bill = memory.facts?.monthlyBill;
  const mentioned = mentionedProvider(text, providers);
  const eligible = eligibleProviders(memory, providers);
  const top = mentioned || eligible[0] || null;
  const topName = top ? nameOf(top) : null;

  if (/^(ok|okay|yes|yeah|sure|correct|right)[.! ]*$/i.test(text)) {
    return bestDiscoveryQuestion(memory);
  }
  if (/\b(i (?:currently )?(?:have|use|am with)|my provider is)\b/i.test(text) && current) {
    return `Got it—you’re currently with ${current}. ${bestDiscoveryQuestion(memory)}`;
  }
  if (/\b(how reliable|reliability|outage|uptime|goes out)\b/i.test(text)) {
    const tech = techOf(top);
    const guidance = tech.includes("fiber")
      ? "Its fiber service is generally a strong fit for consistent performance, video calls, and uploads, although actual service can still vary by location."
      : "Actual reliability depends on the local network and equipment serving the address, so I would compare it against the other verified options rather than promise a specific uptime level.";
    return `${topName || "That provider"}: ${guidance} Is reliability more important to you than getting the lowest monthly price?`;
  }
  if (/\b(how much|price|cost|monthly|quote)\b/i.test(text)) {
    const price = Number(top?.price || top?.monthlyPrice || top?.estimatedMonthlyPrice || quote?.monthlyPrice || 0);
    if (price > 0) {
      const comparison = bill ? ` You’re paying about $${bill} now, so I’ll use that as the savings benchmark.` : "";
      return `${topName || "This option"} is estimated at about $${price} per month before final taxes, fees, equipment, and promotional terms are confirmed.${comparison} Would you like me to prepare the full quote?`;
    }
    return `I don’t have the final address-specific price for ${topName || "that option"} yet, and I don’t want to guess. I can move this to a verified quote so we can compare the true monthly total against ${bill ? `the roughly $${bill} you pay now` : "your current bill"}.`;
  }
  if (/\b(don'?t want|do not want|not interested|remove|exclude)\b/i.test(text)) {
    if (!eligible.length) return "Understood—I’ll leave that provider out. I need to refresh the verified options at your address before I recommend another one.";
    const next = nameOf(eligible[0]);
    return `No problem—I’ve taken that provider out of the running. ${next} is now the strongest remaining option based on what you’ve told me. Would you like the quick reason it moved to the top?`;
  }
  if (/\b(sign me up|move forward|proceed|order|let'?s do it)\b/i.test(text)) {
    return `Great choice. I’ll move this into quote and order preparation now. First, what is the best name and phone number to use for the order?`;
  }
  if (current || bill || (memory.householdNeeds || []).length || (memory.preferences || []).length) {
    const learned = [current && `${current}`, bill && `about $${bill} per month`, (memory.householdNeeds || []).includes("workFromHome") && "working from home"].filter(Boolean).join(", ");
    if (eligible.length && ((memory.preferences || []).length || (memory.painPoints || []).length || (memory.householdNeeds || []).length)) {
      return `Thanks—I have you at ${learned}. Based on that, ${nameOf(eligible[0])} is the first option I’d evaluate, and I’ll compare its real total cost before asking you to switch. Would you rather optimize for savings or reliability?`;
    }
    return `Thanks—I have you at ${learned}. ${bestDiscoveryQuestion(memory)}`;
  }
  return "Thanks—that gives me a starting point. What provider are you with now, and roughly what do you pay each month?";
}
