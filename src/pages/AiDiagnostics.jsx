/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { getRouterDiagnostics, getToolRouterHealth } from "../services/toolRouterService";

export default function AiDiagnostics() {
  const [health, setHealth] = useState(null);
  const [diagnostics, setDiagnostics] = useState({ decisions: [], turns: [] });
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const [healthResult, diagnosticsResult] = await Promise.all([
        getToolRouterHealth(),
        getRouterDiagnostics(sessionId),
      ]);
      setHealth(healthResult);
      setDiagnostics(diagnosticsResult);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ padding: 24, color: "#e5e7eb", background: "#08111f", minHeight: "100vh" }}>
      <h1>AI Diagnostics</h1>
      <p>Inspect ConnectIQ tool routing, customer memory, decisions, and execution telemetry.</p>
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="Optional session ID"
          style={{ minWidth: 320, padding: 10 }} />
        <button onClick={load} style={{ padding: "10px 16px" }}>Refresh</button>
      </div>
      {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
      <section style={{ background: "#111c2e", padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <h2>Router Health</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(health, null, 2)}</pre>
      </section>
      <section style={{ background: "#111c2e", padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <h2>Recent Decisions</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(diagnostics.decisions, null, 2)}</pre>
      </section>
      <section style={{ background: "#111c2e", padding: 16, borderRadius: 12 }}>
        <h2>Recent Turns</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(diagnostics.turns, null, 2)}</pre>
      </section>
    </main>
  );
}
