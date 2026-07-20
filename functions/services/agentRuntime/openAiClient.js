const DEFAULT_TIMEOUT_MS = 30000;

function extractText(payload = {}) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") return content.text;
    }
  }
  return "";
}

export async function generateAgentResponse({ instructions, input, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { enabled: false, text: "", reason: "OPENAI_API_KEY is not configured" };

  const model = process.env.OPENAI_AGENT_MODEL || "gpt-4.1-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.OPENAI_AGENT_TIMEOUT_MS || timeoutMs));
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions,
        input,
        temperature: 0.35,
        max_output_tokens: 450,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `OpenAI agent request failed (${response.status})`);
    }
    const payload = await response.json();
    return { enabled: true, text: extractText(payload).trim(), model };
  } finally {
    clearTimeout(timer);
  }
}
