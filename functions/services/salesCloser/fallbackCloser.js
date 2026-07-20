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
function firstName(value = "") { return String(value).trim().split(/\s+/)[0] || ""; }
function bestDiscoveryQuestion(memory) {
  if (!memory.facts?.currentProvider) return "Out of curiosity, who are you using for internet today?";
  if (!memory.facts?.monthlyBill) return "About how much are you paying each month now?";
  if (!(memory.preferences || []).length && !(memory.painPoints || []).length) return "What would you most like to improve—your monthly price, reliability, speed, or Wi-Fi coverage?";
  return "Would you like me to narrow this to the best-value option or the strongest overall service?";
}
function contactQuestion(memory, quote = null) {
  const facts = memory.facts || {};
  if (!facts.email) return "What's the best email address to send your personalized quote to? I'll only use it for the quote and service follow-up you requested.";
  if (!facts.phone) return "Thanks. What's the best phone number in case we have a question about your quote or installation options?";
  if (!facts.contactPreference) return "Would you prefer updates by text, email, or a phone call?";
  if (!facts.bestContactTime) return "What time of day is usually best—morning, afternoon, or evening?";
  return quote?.provider ? "Perfect. I have what I need to prepare the next step for your quote." : bestDiscoveryQuestion(memory);
}
export function composeSalesCloserFallback({ message, memory = {}, providers = [], quote = null, adaptiveStrategy = null }) {
  const text = String(message || "").trim();
  const facts = memory.facts || {};
  const persona = adaptiveStrategy?.persona || memory.relationship?.persona || "general_shopper";
  const motivation = adaptiveStrategy?.primaryMotivation || memory.relationship?.primaryMotivation || "undetermined";
  const emotion = adaptiveStrategy?.emotion || memory.relationship?.emotion || "neutral";
  const customerName = facts.preferredName || facts.customerName;
  if (!customerName && facts.serviceAddress) return "Hey, I'm David, your ConnectIQ Internet Advisor. Who do I have the pleasure of speaking with?";

  const current = facts.currentProvider;
  const bill = facts.monthlyBill;
  const mentioned = mentionedProvider(text, providers);
  const eligible = eligibleProviders(memory, providers);
  const top = mentioned || eligible[0] || null;
  const topName = top ? nameOf(top) : null;
  const greetingName = firstName(customerName);

  if (persona === "skeptical_shopper" && /\b(just looking|shopping around|researching|comparing|not ready)\b/i.test(text)) {
    return `That makes sense, ${greetingName}. I’ll keep this low-pressure and simply help you compare the real tradeoffs at your address. What matters most to you when you do decide—price, reliability, speed, or Wi-Fi coverage?`;
  }
  if (emotion === "frustrated" && /\b(frustrated|fed up|keeps going out|outage|terrible|awful)\b/i.test(text)) {
    return `I’m sorry you’ve been dealing with that, ${greetingName}. Let’s focus on getting you away from the problem instead of making you repeat it. Is the bigger issue the outages themselves or how they affect work, streaming, or gaming?`;
  }

  if (/\b(send|email|text|quote|move forward|sign me up|let'?s do it|proceed|order)\b/i.test(text) || quote?.provider) {
    if (!facts.email || !facts.phone || !facts.contactPreference) return contactQuestion(memory, quote);
  }
  if (/^(ok|okay|yes|yeah|sure|correct|right)[.! ]*$/i.test(text)) return bestDiscoveryQuestion(memory);
  if (/\b(my name is|i am|i'm|this is)\b/i.test(text) || (/^[a-z][a-z '-]{1,40}$/i.test(text) && !current && !quote?.provider)) {
    return `Nice to meet you, ${greetingName}. ${bestDiscoveryQuestion(memory)}`;
  }
  if (/\b(i (?:currently )?(?:have|use|am with)|my provider is)\b/i.test(text) && current) return `Got it—you’re currently with ${current}. ${bestDiscoveryQuestion(memory)}`;
  if (/\b(how reliable|reliability|outage|uptime|goes out)\b/i.test(text)) {
    const tech = techOf(top);
    const guidance = tech.includes("fiber") ? "Its fiber service is generally a strong fit for consistent performance, video calls, and uploads, although actual service can still vary by location." : "Actual reliability depends on the local network and equipment serving the address, so I would compare it against the other verified options rather than promise a specific uptime level.";
    return `${topName || "That provider"}: ${guidance} Is reliability more important to you than getting the lowest monthly price?`;
  }
  if (/\b(how much|price|cost|monthly)\b/i.test(text)) {
    const price = Number(top?.price || top?.monthlyPrice || top?.estimatedMonthlyPrice || quote?.monthlyPrice || 0);
    if (price > 0) return `${topName || "This option"} is estimated at about $${price} per month before final taxes, fees, equipment, and promotional terms are confirmed.${bill ? ` You’re paying about $${bill} now, so I’ll use that as the savings benchmark.` : ""} Would you like me to prepare the full quote?`;
    return `I don’t have the final address-specific price for ${topName || "that option"} yet, and I don’t want to guess. I can move this to a verified quote so we can compare the true monthly total against ${bill ? `the roughly $${bill} you pay now` : "your current bill"}.`;
  }
  if (/\b(don'?t want|do not want|not interested|remove|exclude)\b/i.test(text)) {
    if (!eligible.length) return "Understood—I’ll leave that provider out. I need to refresh the verified options at your address before I recommend another one.";
    return `No problem—I’ve taken that provider out of the running. ${nameOf(eligible[0])} is now the strongest remaining option based on what you’ve told me. Would you like the quick reason it moved to the top?`;
  }
  if (current || bill || (memory.householdNeeds || []).length || (memory.preferences || []).length) {
    const learned = [current, bill && `about $${bill} per month`, (memory.householdNeeds || []).includes("workFromHome") && "working from home"].filter(Boolean).join(", ");
    if (eligible.length && ((memory.preferences || []).length || (memory.painPoints || []).length || (memory.householdNeeds || []).length)) {
      const reason = motivation === "savings" ? "because lowering your monthly cost is the main goal" : motivation === "reliability" ? "because reliability is the priority you came in with" : motivation === "performance" ? "because it best matches the speed and performance you need" : motivation === "coverage" ? "because we need to solve the whole-home Wi-Fi problem, not just buy more speed" : "based on the priorities you shared";
      const nextQuestion = persona === "ready_buyer" ? "Would you like me to prepare the verified quote now?" : motivation === "savings" ? "Would you like me to compare its real monthly total against your current bill?" : motivation === "reliability" ? "Would you like the quick reason it is the stronger reliability fit?" : motivation === "performance" ? "Would you like me to compare its speed and latency fit for your household?" : "Would you like me to prepare the verified quote?";
      return `Thanks, ${greetingName}. I have you at ${learned}. ${nameOf(eligible[0])} is the first option I’d evaluate ${reason}. ${nextQuestion}`;
    }
    return `Thanks—I have you at ${learned}. ${bestDiscoveryQuestion(memory)}`;
  }
  return `Nice to meet you, ${greetingName}. ${bestDiscoveryQuestion(memory)}`;
}
