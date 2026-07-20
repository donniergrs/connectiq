export function appendJournal(journal = [], event = {}) {
  return [...journal, { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), type: event.type || "TURN", summary: event.summary || "Conversation updated", data: event.data || {} }].slice(-200);
}
