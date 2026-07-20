const journals = new Map();
const threadState = new Map();

const TOPICS = [
  ["order", /\b(sign me up|place (?:the )?order|ready to (?:buy|switch|move forward)|schedule install|complete (?:the )?order)\b/i, 100],
  ["address", /\b(address|available at|service at|live at|moving to|zip code)\b/i, 90],
  ["recommendation", /\b(best|recommend|which (?:provider|plan)|compare|alternative|option)\b/i, 85],
  ["pricing", /(?:\b(?:price|cost|bill|monthly|cheaper|save|budget|expensive)\b|\$\d+)/i, 80],
  ["reliability", /\b(outage|drops?|disconnect|unreliable|keeps going out|reliability)\b/i, 78],
  ["speed", /\b(speed|slow|fast|buffer|lag|latency|upload|download|gig)\b/i, 75],
  ["wifi", /\b(wi-?fi|coverage|dead zone|upstairs|signal|router|mesh)\b/i, 72],
  ["installation", /\b(install|installation|appointment|technician|how long|when can)\b/i, 70],
  ["mobile", /\b(mobile|cell phone|wireless plan)\b/i, 65],
  ["support", /\b(help|problem|issue|not working|technical support)\b/i, 60],
  ["general", /\b(what|why|how|does|can|explain)\b/i, 40],
];

const CORRECTION = /\b(actually|correction|i meant|not that|instead|change that|sorry)\b/i;
const DEFER = /\b(later|not now|skip|next question|move on|don't know|do not know|unsure)\b/i;
const HUMAN = /\b(human|person|representative|agent|call me|talk to someone)\b/i;
const URGENT = /\b(today|asap|urgent|immediately|before (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this week)\b/i;

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function now() { return new Date().toISOString(); }
function sentenceParts(text) { return String(text).split(/(?<=[.!?])\s+|\s+(?:and then|also|but)\s+/i).map(s => s.trim()).filter(Boolean); }

export function analyzeConversation(message = "", prior = {}) {
  const text = String(message).trim();
  const intents = TOPICS.filter(([, re]) => re.test(text)).map(([topic,, priority]) => ({ topic, confidence: Math.min(.98, .68 + priority / 400), priority }));
  if (!intents.length) intents.push({ topic: prior.activeThread || "discovery", confidence: .55, priority: 50 });
  intents.sort((a,b) => b.priority - a.priority);
  return {
    intents,
    primaryTopic: intents[0].topic,
    correction: CORRECTION.test(text),
    deferred: DEFER.test(text),
    humanHandoff: HUMAN.test(text),
    urgency: URGENT.test(text) ? "high" : "normal",
    segments: sentenceParts(text),
    analyzedAt: now(),
  };
}

function stateFor(sessionId) {
  if (!threadState.has(sessionId)) threadState.set(sessionId, { primaryGoal: "internet_recommendation", activeThread: "discovery", threads: {}, answeredQuestions: [], deferredQuestions: [], turn: 0 });
  return threadState.get(sessionId);
}

export function orchestrateConversation({ sessionId, message, memory = {}, intent = {} }) {
  const state = stateFor(sessionId);
  state.turn += 1;
  const analysis = analyzeConversation(message, state);
  for (const item of analysis.intents) {
    const existing = state.threads[item.topic] || {};
    state.threads[item.topic] = { topic: item.topic, status: "open", priority: item.priority, confidence: item.confidence, openedAt: existing.openedAt || now(), lastActivityAt: now(), turns: (existing.turns || 0) + 1 };
  }
  if (analysis.deferred) {
    state.threads[analysis.primaryTopic].status = "deferred";
    state.deferredQuestions.push({ topic: analysis.primaryTopic, at: now() });
  } else {
    state.activeThread = analysis.primaryTopic;
  }
  if (analysis.humanHandoff) state.activeThread = "human_handoff";

  const completed = [];
  if (memory.facts?.currentProvider) completed.push("currentProvider");
  if (memory.facts?.monthlyBill) completed.push("monthlyBill");
  if ((memory.painPoints || []).length || (memory.householdNeeds || []).length || memory.preferences?.primaryPriority) completed.push("priority");
  state.completedDiscovery = [...new Set(completed)];

  const event = { type: analysis.correction ? "correction" : "customer_turn", turn: state.turn, activeThread: state.activeThread, topics: analysis.intents.map(i => i.topic), urgency: analysis.urgency, factsKnown: Object.keys(memory.facts || {}), recordedAt: now() };
  if (!journals.has(sessionId)) journals.set(sessionId, []);
  journals.get(sessionId).unshift(event);

  return clone({ ...state, openThreads: Object.values(state.threads).filter((t) => t.status === "open").map((t) => t.topic), analysis, journalEvent: event });
}

export function recordAskedQuestion(sessionId, questionKey) {
  const state = stateFor(sessionId);
  if (!state.answeredQuestions.includes(questionKey)) state.answeredQuestions.push(questionKey);
}
export function hasAskedQuestion(sessionId, questionKey) { return stateFor(sessionId).answeredQuestions.includes(questionKey); }
export function getConversationState(sessionId) { return clone(stateFor(sessionId)); }
export function getConversationJournal(sessionId, limit = 100) { return clone((journals.get(sessionId) || []).slice(0, limit)); }
export function clearConversationOrchestrator() { journals.clear(); threadState.clear(); }
