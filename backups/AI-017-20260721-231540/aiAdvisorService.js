const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `AI Advisor request failed (${response.status}).`);
  return payload;
}

export function sendAdvisorTurn(payload) {
  return request("/api/conversations/advisor/turn", { method: "POST", body: JSON.stringify(payload) });
}

export function getAdvisorHealth() {
  return request("/api/conversations/advisor/health");
}

export function getAdvisorSessions() {
  return request("/api/conversations/advisor/sessions");
}
