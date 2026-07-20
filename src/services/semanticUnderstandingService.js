const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Cognitive Engine request failed (${response.status}).`);
  }
  return payload;
}

export function processAdvisorMessage({ text, customerId, sessionId, channel = "web" }) {
  return request("/api/semantic-understanding/process", {
    method: "POST",
    body: JSON.stringify({ text, customerId, sessionId, channel }),
  });
}

export function getSemanticUnderstandingHealth() {
  return request("/api/semantic-understanding/health");
}
