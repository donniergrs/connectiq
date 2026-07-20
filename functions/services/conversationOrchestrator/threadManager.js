const TOPICS = {
  recommendation: /\b(best|recommend|which provider|compare|option)\b/i,
  pricing: /\b(price|cost|bill|cheaper|save|expensive|monthly)\b/i,
  reliability: /\b(reliable|outage|disconnect|going out|drops?|unstable)\b/i,
  speed: /\b(speed|fast|slow|buffer|lag|latency|upload|download)\b/i,
  wifi: /\b(wi-?fi|coverage|dead zone|upstairs|signal|router)\b/i,
  installation: /\b(install|installation|appointment|technician|how long|when can)\b/i,
  mobile: /\b(mobile|cell phone|wireless plan)\b/i,
  order: /\b(order|sign up|buy|purchase|ready to switch|start service)\b/i,
  support: /\b(help|support|not working|technical issue)\b/i,
  handoff: /\b(human|person|representative|agent|call me|speak to someone)\b/i,
};

export function detectTopics(message = "") {
  const text = String(message);
  return Object.entries(TOPICS).filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
}

export function createThread(topic, now = new Date().toISOString()) {
  return { id: `${topic}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, topic, status: "OPEN", priority: topic === "handoff" || topic === "order" ? 100 : 50, openedAt: now, lastActivityAt: now };
}

export function updateThreads(existing = [], topics = [], now = new Date().toISOString()) {
  const threads = existing.map((item) => ({ ...item }));
  for (const topic of topics) {
    const found = threads.find((item) => item.topic === topic && item.status !== "RESOLVED");
    if (found) found.lastActivityAt = now;
    else threads.push(createThread(topic, now));
  }
  return threads.sort((a, b) => b.priority - a.priority || String(b.lastActivityAt).localeCompare(String(a.lastActivityAt)));
}
