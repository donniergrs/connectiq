const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();

// Production uses same-origin /api routes so Firebase Hosting rewrites requests
// to the deployed Cloud Function. Local Vite development continues to use the
// local backend unless VITE_API_BASE_URL explicitly overrides it.
const API_BASE = (
  configuredApiBase || (import.meta.env.DEV ? "http://localhost:5001" : "")
).replace(/\/$/, "");

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (error) {
    throw new Error(
      "I’m having trouble reaching the ConnectIQ advisor right now. Please try again in a moment."
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.error || payload.message || `ConnectIQ Advisor request failed (${response.status}).`
    );
  }

  return payload;
}

export function sendAdvisorTurn(payload) {
  return request("/api/conversations/advisor/turn", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdvisorHealth() {
  return request("/api/conversations/advisor/health");
}

export function getAdvisorSessions() {
  return request("/api/conversations/advisor/sessions");
}
