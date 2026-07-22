const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const leadIdBySession = new Map();

async function persist(payload) {
  const response = await fetch(`${API_BASE}/api/leads/advisor/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Lead persistence failed (${response.status}).`);
  if (body.leadId) leadIdBySession.set(payload.sessionId, body.leadId);
  return body;
}

export async function ensureAdvisorLead({ sessionId, address, providers = [] }) {
  const result = await persist({ sessionId, address, providers, stage: "Address Verified" });
  return result.leadId;
}

export async function syncAdvisorLead({ sessionId, address, providers = [], memory = {}, intelligence = {}, quote = null, customerMessage = "", advisorMessage = "", stage = "" }) {
  const result = await persist({ sessionId, address, providers, memory, intelligence, quote, customerMessage, advisorMessage, stage: stage || memory.stage || intelligence.pipelineStage || "Discovery" });
  return result.leadId;
}
