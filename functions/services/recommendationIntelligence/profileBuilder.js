const clean = (value) => String(value ?? "").trim();
const money = (value) => {
  const match = clean(value).replace(/,/g, "").match(/(?:\$\s*)?(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
};
const boolFrom = (value) => {
  if (typeof value === "boolean") return value;
  const text = clean(value).toLowerCase();
  if (!text) return null;
  if (/\b(no|not|never|none)\b/.test(text)) return false;
  if (/\b(yes|yep|yeah|true|often|daily|regularly)\b/.test(text)) return true;
  return null;
};
const unique = (items) => [...new Set(items.filter(Boolean))];

function conversationText(source = {}) {
  const rows = source.conversation || source.messages || source.transcript || [];
  if (typeof rows === "string") return rows;
  return Array.isArray(rows)
    ? rows.map((item) => clean(item?.text || item?.content || item?.message)).filter(Boolean).join(" ")
    : "";
}

export function buildCustomerProfile(source = {}) {
  const existing = source.customerProfile || source.needs || source.salesSummary?.household || {};
  const text = conversationText(source);
  const lower = text.toLowerCase();
  const currentProviderMatch = text.match(/(?:have|with|use|provider is|currently have)\s+(?:internet\s+from\s+)?([A-Za-z&. -]{2,30}?)(?:\s+and|\s*,|\s+pay|\.|$)/i);
  const billMatch = text.match(/(?:pay|bill is|costs?|spend)\s+(?:about\s+|around\s+)?\$?\s*(\d+(?:\.\d{1,2})?)/i);
  const rejectedProviders = unique([
    ...(existing.rejectedProviders || source.rejectedProviders || []),
    ...[...text.matchAll(/(?:do not want|don't want|not interested in|no\s+)([A-Za-z&. -]{2,30}?)(?:\.|,|$)/gi)].map((m) => clean(m[1])),
  ]);
  const painPoints = unique([
    ...(existing.painPoints || []),
    /(too expensive|high bill|lower(?: my| the)? bill|save money)/i.test(text) && "High monthly bill",
    /(drop|disconnect|outage|unreliable|reliability)/i.test(text) && "Reliability problems",
    /(wifi|wi-fi).*(weak|coverage|dead zone|drop)/i.test(text) && "Wi-Fi coverage",
    /(slow|buffer|lag)/i.test(text) && "Slow performance",
  ]);
  const goals = unique([
    ...(existing.goals || []),
    /(lower(?: my| the)? bill|save money|cheaper|less expensive)/i.test(text) && "Lower monthly cost",
    /(reliable|reliability|stable|stop dropping)/i.test(text) && "Improve reliability",
    /(faster|speed|gig)/i.test(text) && "Increase speed",
    /(wifi|wi-fi).*(coverage|better)/i.test(text) && "Improve Wi-Fi coverage",
  ]);

  return {
    currentProvider: clean(source.currentProvider || source.existingProvider || existing.currentProvider || currentProviderMatch?.[1]) || null,
    monthlyBill: Number(source.monthlyBill ?? existing.monthlyBill ?? money(billMatch?.[1])) || null,
    contractStatus: clean(source.contractStatus || existing.contractStatus) || "Unknown",
    workFromHome: source.workFromHome ?? existing.workFromHome ?? /work(?:ing)? from home|remote work|teams call|zoom call/i.test(text),
    gaming: source.gaming ?? existing.gaming ?? /\bgam(?:e|er|ing)\b|xbox|playstation/i.test(text),
    streaming: source.streaming ?? existing.streaming ?? /stream|netflix|hulu|youtube tv/i.test(text),
    uploadIntensive: source.uploadIntensive ?? existing.uploadIntensive ?? /upload|content creator|backup|cloud files/i.test(text),
    budget: Number(source.budget ?? existing.budget) || null,
    reliabilityPriority: clean(source.reliabilityPriority || existing.reliabilityPriority) || (/(reliable|reliability|stable|drop|outage)/i.test(text) ? "High" : "Medium"),
    pricePriority: clean(source.pricePriority || existing.pricePriority) || (/(lower(?: my| the)? bill|save money|cheaper|too expensive)/i.test(text) ? "High" : "Medium"),
    speedPriority: clean(source.speedPriority || existing.speedPriority) || (/(faster|speed|gig|slow|buffer|lag)/i.test(text) ? "High" : "Medium"),
    painPoints,
    goals,
    rejectedProviders,
    interestedProviders: unique(existing.interestedProviders || source.interestedProviders || []),
    notes: clean(existing.notes || source.notes) || null,
    sourceCompleteness: {
      provider: Boolean(source.currentProvider || source.existingProvider || existing.currentProvider || currentProviderMatch),
      bill: Boolean(source.monthlyBill || existing.monthlyBill || billMatch),
      usage: Boolean(text || Object.keys(existing).length),
    },
  };
}

export function profileMissingInformation(profile = {}) {
  const missing = [];
  if (!profile.currentProvider) missing.push("current provider");
  if (!profile.monthlyBill) missing.push("current monthly bill");
  if (!profile.workFromHome && !profile.gaming && !profile.streaming && !profile.uploadIntensive) missing.push("primary internet usage");
  if (!profile.painPoints?.length && !profile.goals?.length) missing.push("main reason for switching");
  return missing;
}
