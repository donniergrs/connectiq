const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed with status ${response.status}`);
  return body;
}

export function getToolRouterHealth() {
  return request("/api/conversations/router/health");
}

export function routeConversationTurn(payload) {
  return request("/api/conversations/router/turn", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRouterDiagnostics(sessionId = "") {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return request(`/api/conversations/router/diagnostics${query}`);
}
