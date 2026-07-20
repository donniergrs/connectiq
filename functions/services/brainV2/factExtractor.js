const PROVIDERS = ["AT&T", "ATT", "Spectrum", "Xfinity", "Comcast", "Frontier", "Verizon", "Cox", "Lumos", "Windstream", "T-Mobile", "TMobile", "Google Fiber", "EarthLink", "HughesNet", "Viasat"];
const providerRegex = new RegExp(`\\b(${PROVIDERS.join("|")})\\b`, "i");

function normalizeProvider(value = "") {
  const compact = String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return ({ att: "AT&T", tmobile: "T-Mobile", comcast: "Xfinity" })[compact] || String(value).trim().replace(/\b\w/g, c => c.toUpperCase());
}

export function extractConversationFacts(message = "", previous = {}) {
  const text = String(message).trim();
  const lower = text.toLowerCase();
  const facts = {};
  const needs = [];
  const painPoints = [];
  const preferences = [];

  const providerMatch = text.match(providerRegex);
  if (providerMatch && /\b(with|have|using|provider|actually|currently|now)\b/i.test(text)) facts.currentProvider = normalizeProvider(providerMatch[1]);

  const billMatch = text.match(/(?:pay(?:ing)?|bill(?: is)?|costs?|about)\s*(?:about\s*)?\$?\s*(\d{2,4}(?:\.\d{1,2})?)/i) || text.match(/\$\s*(\d{2,4}(?:\.\d{1,2})?)/);
  if (billMatch) facts.monthlyBill = Number(billMatch[1]);

  const budgetMatch = text.match(/(?:under|below|less than|no more than|budget(?: is| of)?|spend over)\s*\$?\s*(\d{2,4})/i);
  if (budgetMatch) facts.monthlyBudget = Number(budgetMatch[1]);

  const kidsMatch = text.match(/\b(\d+)\s+(?:kids|children)\b/i);
  if (kidsMatch) facts.children = Number(kidsMatch[1]);

  if (/\b(work from home|remote work|zoom|teams|video calls?)\b/i.test(text)) needs.push("workFromHome");
  if (/\b(stream|streaming|netflix|hulu|youtube tv)\b/i.test(text)) needs.push("streaming");
  if (/\b(gam(?:e|er|ing)|xbox|playstation)\b/i.test(text)) needs.push("gaming");
  if (/\b(upstairs|dead zone|coverage|weak signal|wifi is awful|wi-fi is awful)\b/i.test(text)) painPoints.push("wifiCoverage");
  if (/\b(slow|buffer|lag)\b/i.test(text)) painPoints.push("speed");
  if (/\b(outage|unreliable|disconnect|goes out)\b/i.test(text)) painPoints.push("reliability");
  if (/\b(lower(?:ing)? my bill|cheaper|save money|budget|under \$|spend over)\b/i.test(text)) { painPoints.push("price"); preferences.push("price"); }
  if (/\b(reliab|uptime)\b/i.test(text)) preferences.push("reliability");
  if (/\b(fast|speed)\b/i.test(text)) preferences.push("speed");
  if (/\b(wi-?fi|coverage|upstairs)\b/i.test(text)) preferences.push("wifiCoverage");

  const isCorrection = /\b(actually|correction|i meant|not anymore|now with)\b/i.test(lower) && Boolean(facts.currentProvider);
  return { facts, needs, painPoints, preferences, isCorrection, previousProvider: isCorrection ? previous?.facts?.currentProvider || null : null };
}
