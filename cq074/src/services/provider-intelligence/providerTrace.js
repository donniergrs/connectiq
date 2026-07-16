let sequence = 0;

export function createProviderTrace(address = "", origin = "diagnostics") {
  sequence += 1;
  const startedAt = new Date();
  const id = `PI-${startedAt.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${String(sequence).padStart(4, "0")}`;
  return {
    id,
    address,
    origin,
    status: "running",
    startedAt: startedAt.toISOString(),
    completedAt: null,
    durationMs: null,
    events: [{ step: "address_received", at: startedAt.toISOString(), detail: address }],
    errors: [],
  };
}

export function addTraceEvent(trace, step, detail = "") {
  return {
    ...trace,
    events: [...(trace.events || []), { step, detail, at: new Date().toISOString() }],
  };
}

export function completeProviderTrace(trace, status = "complete", error = null) {
  const completedAt = new Date();
  const started = new Date(trace.startedAt).getTime();
  return {
    ...trace,
    status,
    completedAt: completedAt.toISOString(),
    durationMs: Math.max(0, completedAt.getTime() - started),
    errors: error ? [...(trace.errors || []), String(error.message || error)] : trace.errors || [],
  };
}
