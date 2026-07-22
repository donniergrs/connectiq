const textOf = (value = "") => String(value).trim().toLowerCase();

export function detectComparisonIntent(message = "") {
  const text = textOf(message);
  if (/\b(cheapest|lowest price|least expensive|save the most|lowest monthly)\b/.test(text)) return "cheapest";
  if (/\b(pricing|prices?|cost|monthly|fees?|how much|lower bill)\b/.test(text)) return "price";
  if (/\b(most reliable|reliability|reliable|uptime|outages?)\b/.test(text)) return "reliability";
  if (/\b(fastest|speed|download|upload|bandwidth|latency|ping)\b/.test(text)) return "speed";
  if (/\b(best value|value|balance|all three|price.*reliab.*speed)\b/.test(text)) return "value";
  if (/\b(fiber only|only fiber|want fiber)\b/.test(text)) return "fiber";
  if (/\b(cable only|only cable)\b/.test(text)) return "cable";
  return null;
}

export function detectSalesIntents(message = "") {
  const text = textOf(message);
  const intents = [];
  const add = (intent, regex) => { if (regex.test(text)) intents.push(intent); };
  add("price", /\b(price|pricing|cheap|cheaper|save|lower bill|cost|monthly)\b/);
  add("reliability", /\b(reliab|uptime|outage|disconnect|goes out|stable)\w*\b/);
  add("speed", /\b(speed|fast|faster|slow|bandwidth|download|upload|latency|ping)\b/);
  add("workFromHome", /\b(work from home|remote work|zoom|teams|video calls?)\b/);
  add("streaming", /\b(stream|streaming|netflix|hulu|youtube tv|tv)\b/);
  add("gaming", /\b(game|gamer|gaming|xbox|playstation)\b/);
  add("bundle", /\b(bundle|mobile|wireless|phone service)\b/);
  add("moving", /\b(move|moving|new home|new address)\b/);
  add("objection", /\b(too expensive|heard.*bad|terrible service|contract|installation fee|not sure|maybe)\b/);
  return [...new Set(intents)];
}

export function isAcceptance(message = "") {
  return /^(?:ok|okay|yes|yeah|yep|sure|that works|sounds good|go ahead|continue|please do|looks good)[.! ]*$/i.test(String(message).trim());
}

export function isDecline(message = "") {
  return /^(?:no|nope|no thanks|not now|not at this time|nothing else|that(?:'s| is) all|i(?:'m| am) good|all set|thank you|thanks|stop|done)[.! ]*$/i.test(String(message).trim());
}

export function isProviderQuestion(message = "") {
  return /\b(why|how reliable|how much|price|cost|fees?|contract|install|mobile|bundle|tell me about|compare|what about|keep my current)\b/i.test(String(message));
}
