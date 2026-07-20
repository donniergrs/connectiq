const journals = new Map();

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function appendJournalEvent(sessionId, type, detail = {}) {
  const events = journals.get(sessionId) || [];
  const event = {
    id: `${sessionId}-${events.length + 1}`,
    type,
    detail,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  journals.set(sessionId, events.slice(-250));
  return clone(event);
}

export function getConversationJournal(sessionId) {
  return clone(journals.get(sessionId) || []);
}

export function clearConversationJournals() { journals.clear(); }
