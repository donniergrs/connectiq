const THREAD_DEFINITIONS = {
  discovery: { priority: 60 },
  recommendation: { priority: 70 },
  pricing: { priority: 75 },
  reliability: { priority: 75 },
  speed: { priority: 70 },
  wifi: { priority: 68 },
  installation: { priority: 72 },
  order: { priority: 95 },
  objection: { priority: 90 },
  knowledge: { priority: 65 },
  human_handoff: { priority: 100 },
};

function title(topic) { return topic.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()); }

export function inferTopics({ message = "", intent = {}, learned = {} } = {}) {
  const text = String(message).toLowerCase();
  const topics = new Set();
  for (const item of intent.intents || []) {
    const map = { orderReadiness: "order", objection: "objection", recommendation: "recommendation", knowledge: "knowledge", discovery: "discovery" };
    topics.add(map[item.intent] || item.intent);
  }
  for (const pain of learned.painPoints || []) topics.add(pain === "wifiCoverage" ? "wifi" : pain);
  if (/\b(install|installation|appointment|schedule|technician|when can)\b/.test(text)) topics.add("installation");
  if (/\b(agent|human|person|representative|call me)\b/.test(text)) topics.add("human_handoff");
  if (/\b(price|cost|bill|cheap|cheaper|save|monthly)\b/.test(text)) topics.add("pricing");
  return [...topics];
}

export function updateThreads(currentThreads = [], topics = [], activeTopic = null) {
  const byTopic = new Map((currentThreads || []).map(t => [t.topic, { ...t }]));
  const now = new Date().toISOString();
  for (const topic of topics) {
    const def = THREAD_DEFINITIONS[topic] || { priority: 50 };
    const existing = byTopic.get(topic);
    byTopic.set(topic, {
      id: existing?.id || `thread-${topic}`,
      topic,
      title: title(topic),
      status: existing?.status === "resolved" ? "reopened" : "open",
      priority: def.priority,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      turnCount: (existing?.turnCount || 0) + 1,
    });
  }
  if (activeTopic && byTopic.has(activeTopic)) byTopic.get(activeTopic).status = "active";
  return [...byTopic.values()].sort((a,b) => b.priority - a.priority);
}

export function chooseActiveThread(threads = []) {
  return [...threads].sort((a,b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt))[0] || null;
}
