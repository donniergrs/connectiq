import { useMemo, useState } from "react";
import { runFccDiagnostic, runFccExplorer } from "../services/fccExplorerService";

export default function FccExplorer() {
  const [address, setAddress] = useState("101 plum creek ln greenville sc 29607");
  const [limit, setLimit] = useState(13);
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const successfulAttempts = useMemo(() => (result?.attempts || []).filter((item) => item.ok), [result]);
  const providerAttempts = useMemo(() => (result?.attempts || []).filter((item) => item.providerCount > 0), [result]);

  async function handleDiagnostic() {
    setLoading(true);
    setError("");
    try {
      const data = await runFccDiagnostic();
      setDiagnostic(data);
    } catch (err) {
      setError(err.message || "Diagnostic failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExplore(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await runFccExplorer({ address, limit, stopOnSuccess: false });
      setResult(data);
    } catch (err) {
      setError(err.message || "Explorer failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="admin-heading">
        <span>FCC Endpoint Mapping</span>
        <h1>FCC Provider Endpoint Explorer</h1>
        <p>Test candidate FCC provider endpoints safely without breaking the working advisor lookup flow.</p>
      </div>

      <div className="fcc-explorer-grid">
        <div className="admin-table-card">
          <h2>Authentication</h2>
          <p className="muted-copy">Confirms backend credentials and FCC as-of-date access.</p>
          <button className="admin-save-button" onClick={handleDiagnostic} disabled={loading}>
            {loading ? "Testing..." : "Run Diagnostic"}
          </button>

          {diagnostic && (
            <div className="fcc-status-card">
              <div><strong>Status</strong><span className={diagnostic.ok ? "good" : "warn"}>{diagnostic.ok ? "Connected" : "Check Needed"}</span></div>
              <div><strong>Username</strong><span>{diagnostic.username || "—"}</span></div>
              <div><strong>Token Length</strong><span>{diagnostic.hashLength || 0}</span></div>
              <div><strong>Base URL</strong><span>{diagnostic.baseUrl || "—"}</span></div>
            </div>
          )}
        </div>

        <div className="admin-table-card">
          <h2>Explore Endpoints</h2>
          <form onSubmit={handleExplore} className="fcc-form-stack">
            <label>Address</label>
            <input className="admin-input" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <label>Candidate Limit</label>
            <select className="admin-input" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={6}>6 endpoint candidates</option>
              <option value={13}>13 endpoint candidates</option>
              <option value={20}>20 endpoint candidates</option>
            </select>
            <button className="admin-save-button" disabled={loading}>{loading ? "Exploring..." : "Run FCC Explorer"}</button>
          </form>
        </div>
      </div>

      {error && <div className="funnel-error">{error}</div>}

      {result && (
        <div className="admin-table-card fcc-explorer-results">
          <div className="table-header">
            <div>
              <h2>Explorer Results</h2>
              <p>{result.geocode?.matchedAddress || result.address}</p>
            </div>
            <span className={result.ok ? "source-pill live" : "source-pill fallback"}>{result.ok ? "Provider rows found" : "No provider rows yet"}</span>
          </div>

          <div className="fcc-summary-strip">
            <div><strong>Successful HTTP Calls</strong><span>{successfulAttempts.length}</span></div>
            <div><strong>Provider-Row Attempts</strong><span>{providerAttempts.length}</span></div>
            <div><strong>As Of Date</strong><span>{result.asOfDate || "—"}</span></div>
            <div><strong>Lat / Lng</strong><span>{result.geocode?.latitude || "—"} / {result.geocode?.longitude || "—"}</span></div>
          </div>

          {result.providers?.length > 0 && (
            <div className="provider-comparison-table-wrap">
              <h3>Provider Rows Found</h3>
              <table className="admin-table">
                <thead><tr><th>Provider</th><th>Technology</th><th>Download</th><th>Upload</th><th>Score</th></tr></thead>
                <tbody>
                  {result.providers.map((provider) => (
                    <tr key={provider.id}>
                      <td>{provider.name}</td>
                      <td>{provider.technology}</td>
                      <td>{provider.download || 0} Mbps</td>
                      <td>{provider.upload || 0} Mbps</td>
                      <td><span className="mini-score">{provider.score || 0}/100</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>Candidate Endpoint Attempts</h3>
          <div className="endpoint-attempts">
            {(result.attempts || []).map((attempt, index) => (
              <details className="endpoint-attempt" key={`${attempt.url}-${attempt.authStyle}-${index}`}>
                <summary>
                  <span>{attempt.status || attempt.error || "—"}</span>
                  <strong>{attempt.authStyle}</strong>
                  <em>{attempt.providerCount || 0} providers</em>
                </summary>
                <code>{attempt.url}</code>
                <pre>{attempt.preview || attempt.error || "No response preview"}</pre>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
