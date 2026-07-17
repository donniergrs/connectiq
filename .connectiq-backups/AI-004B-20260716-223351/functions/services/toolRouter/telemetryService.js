const decisions = [];
const turns = [];
const MAX_RECORDS = 1000;

function retain(list, value) {
  list.push(value);
  if (list.length > MAX_RECORDS) list.splice(0, list.length - MAX_RECORDS);
  return value;
}

export function recordDecision(record) {
  return retain(decisions, { ...record, recordedAt: new Date().toISOString() });
}

export function recordTurn(record) {
  return retain(turns, { ...record, recordedAt: new Date().toISOString() });
}

export function getDiagnostics({ sessionId, limit = 100 } = {}) {
  const filter = (item) => !sessionId || item.sessionId === sessionId;
  return {
    decisions: decisions.filter(filter).slice(-limit).reverse(),
    turns: turns.filter(filter).slice(-limit).reverse(),
  };
}

export function telemetryHealth() {
  return { ok: true, decisionCount: decisions.length, turnCount: turns.length, retention: MAX_RECORDS };
}

export function clearTelemetry() {
  decisions.length = 0;
  turns.length = 0;
}
