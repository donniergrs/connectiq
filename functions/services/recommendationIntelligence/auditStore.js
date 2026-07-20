const records = [];
const RETENTION = 1000;
export function recordRecommendation(entry) {
  const record = { id: `rec-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, recordedAt: new Date().toISOString(), ...entry };
  records.unshift(record);
  if (records.length > RETENTION) records.length = RETENTION;
  return record;
}
export function listRecommendationAudit({ limit = 100 } = {}) { return records.slice(0, Math.max(1, Math.min(Number(limit)||100, 500))); }
export function auditHealth() { return { ok: true, count: records.length, retention: RETENTION }; }
