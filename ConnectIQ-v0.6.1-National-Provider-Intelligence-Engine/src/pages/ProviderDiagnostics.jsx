import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  FileSearch,
  Gauge,
  MapPin,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
  XCircle,
} from "lucide-react";
import { lookupProviders } from "../services/fccService";
import {
  ARCHITECTURE_DECISIONS,
  PROVIDER_DEPENDENCIES,
  runProviderDiagnostic,
} from "../services/provider-intelligence";

function formatSpeed(download, upload) {
  return `${Number(download || 0).toLocaleString()} / ${Number(upload || 0).toLocaleString()} Mbps`;
}

function providerScore(provider) {
  const technology = String(provider.technology || "").toLowerCase();
  let score = 35;
  if (technology.includes("fiber")) score += 35;
  else if (technology.includes("cable")) score += 24;
  else if (technology.includes("fixed wireless")) score += 12;
  else if (technology.includes("satellite")) score += 4;
  score += Math.min(20, Math.round(Number(provider.download || 0) / 250));
  score += Math.min(10, Math.round(Number(provider.upload || 0) / 100));
  if (provider.lowLatency) score += 5;
  if (!provider.verified) score = Math.min(score, 49);
  return Math.max(0, Math.min(100, score));
}

function scoreTone(score) {
  if (score >= 80) return "good";
  if (score >= 55) return "fair";
  return "review";
}

function copyText(value) {
  if (!value || !navigator?.clipboard) return;
  navigator.clipboard.writeText(String(value));
}

export default function ProviderDiagnostics() {
  const [address, setAddress] = useState("");
  const [currentCarrier, setCurrentCarrier] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setSelectedProvider(null);
    const result = await runProviderDiagnostic({
      address,
      currentCarrier,
      lookup: lookupProviders,
      origin: "provider-diagnostics",
    });
    setReport(result);
    setLoading(false);
  }

  const providerRows = useMemo(
    () =>
      (report?.normalizedProviders || [])
        .map((provider) => ({ ...provider, score: providerScore(provider) }))
        .sort((a, b) => b.score - a.score),
    [report],
  );

  const verifiedCount = providerRows.filter((provider) => provider.verified).length;
  const bestProvider = report?.recommendation?.recommendation || null;
  const lookupStatus = !report
    ? "Not run"
    : report.error
      ? "Lookup failed"
      : report.audit.hasStaticFallback
        ? "Audit warning"
        : verifiedCount > 0
          ? "Verified"
          : "Verification required";
  const diagnosticsScore = !report
    ? 0
    : report.error
      ? 15
      : report.audit.hasStaticFallback
        ? 42
        : verifiedCount
          ? 95
          : 58;

  return (
    <main className="pid-page">
      <header className="pid-header">
        <div>
          <span className="pid-eyebrow">Release 5.0.5 RC1</span>
          <h1>Provider Diagnostics</h1>
          <p>Trace provider data, verify the source, and understand every recommendation.</p>
        </div>
        <div className="pid-header-actions">
          <button className="pid-button pid-button-secondary" type="button" onClick={() => setShowAudit((value) => !value)}>
            <FileSearch size={17} /> Audit details
          </button>
          <button className="pid-button pid-button-primary" type="submit" form="provider-diagnostic-form" disabled={loading || !address.trim()}>
            <Search size={17} /> {loading ? "Running diagnostic…" : "Run full diagnostic"}
          </button>
        </div>
      </header>

      <section className="pid-kpi-grid" aria-label="Diagnostic summary">
        <article className="pid-kpi-card">
          <div className="pid-kpi-icon indigo"><Gauge size={21} /></div>
          <div><span>Diagnostic score</span><strong>{diagnosticsScore}<small>/100</small></strong><p>{report ? lookupStatus : "Run a lookup to begin"}</p></div>
        </article>
        <article className="pid-kpi-card">
          <div className="pid-kpi-icon green"><CheckCircle2 size={21} /></div>
          <div><span>Verified providers</span><strong>{verifiedCount}</strong><p>of {providerRows.length} returned</p></div>
        </article>
        <article className="pid-kpi-card">
          <div className="pid-kpi-icon amber"><Sparkles size={21} /></div>
          <div><span>Best verified option</span><strong className="pid-kpi-provider">{bestProvider?.displayName || "None"}</strong><p>{bestProvider ? formatSpeed(bestProvider.download, bestProvider.upload) : report?.aiCandidates?.length ? `${report.aiCandidates.length} AI candidates need verification` : "No fallback used"}</p></div>
        </article>
        <article className="pid-kpi-card">
          <div className="pid-kpi-icon blue"><Clock3 size={21} /></div>
          <div><span>Response time</span><strong>{report?.trace?.durationMs ?? "—"}<small>{report ? " ms" : ""}</small></strong><p>{report?.trace?.status || "Waiting"}</p></div>
        </article>
        <article className="pid-kpi-card">
          <div className={`pid-kpi-icon ${report?.audit?.hasStaticFallback ? "red" : "green"}`}>
            {report?.audit?.hasStaticFallback ? <AlertTriangle size={21} /> : <ShieldCheck size={21} />}
          </div>
          <div><span>Source confidence</span><strong>{report ? (report.audit.hasStaticFallback ? "Review" : verifiedCount ? "High" : "Pending") : "—"}</strong><p>{report?.audit?.source || "No source queried"}</p></div>
        </article>
      </section>

      <section className="pid-search-card">
        <form id="provider-diagnostic-form" className="pid-search-form" onSubmit={submit}>
          <label>
            <span>Service address</span>
            <div className="pid-input-wrap"><MapPin size={17} /><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="1935 Fort Prince Blvd, Wellford, SC 29385" required /></div>
          </label>
          <label>
            <span>Current carrier <em>(optional)</em></span>
            <div className="pid-input-wrap"><RadioTower size={17} /><input value={currentCarrier} onChange={(event) => setCurrentCarrier(event.target.value)} placeholder="Spectrum" /></div>
          </label>
          <button className="pid-button pid-button-primary pid-search-button" disabled={loading || !address.trim()}>
            <Search size={17} /> {loading ? "Tracing…" : "Run provider trace"}
          </button>
        </form>
        <div className={`pid-status-banner ${report ? (report.error ? "danger" : report.audit.hasStaticFallback ? "warning" : verifiedCount ? "success" : "neutral") : "neutral"}`}>
          {report ? (report.error ? <XCircle /> : report.audit.hasStaticFallback ? <AlertTriangle /> : verifiedCount ? <CheckCircle2 /> : <CircleAlert />) : <Database />}
          <div>
            <strong>{report ? lookupStatus : "Ready for diagnostic"}</strong>
            <span>{report ? (report.error || report.audit.warnings[0] || `${providerRows.length} provider records returned.`) : "Enter an address to inspect provider availability."}</span>
          </div>
        </div>
      </section>

      {report && (
        <div className="pid-content-grid">
          <section className="pid-panel pid-provider-panel">
            <div className="pid-panel-heading">
              <div><h2>Provider results <span>({providerRows.length})</span></h2><p>Only verified providers are eligible for recommendation.</p></div>
              <span className="pid-source-pill"><Database size={14} /> {report.audit.source}</span>
            </div>

            {providerRows.length ? (
              <div className="pid-provider-table-wrap">
                <table className="pid-provider-table">
                  <thead><tr><th>Provider</th><th>Technology</th><th>Speed (down / up)</th><th>Status</th><th>Score</th><th></th></tr></thead>
                  <tbody>
                    {providerRows.map((provider) => (
                      <tr key={`${provider.id}-${provider.technology}`} className={bestProvider?.id === provider.id ? "is-recommended" : ""}>
                        <td><div className="pid-provider-name"><span className="pid-provider-mark"><Wifi size={17} /></span><div><strong>{provider.displayName}</strong><small>{provider.providerId ? `ID: ${provider.providerId}` : provider.source}</small></div></div></td>
                        <td><span className="pid-tech-pill">{provider.technology}</span></td>
                        <td><strong>{formatSpeed(provider.download, provider.upload)}</strong></td>
                        <td><span className={`pid-verification-pill ${provider.verified ? "verified" : "unverified"}`}>{provider.verified ? <Check size={13} /> : <AlertTriangle size={13} />}{provider.verified ? "Verified" : "Unverified"}</span></td>
                        <td><span className={`pid-score ${scoreTone(provider.score)}`}>{provider.score}</span></td>
                        <td><button className="pid-row-button" type="button" onClick={() => setSelectedProvider(provider)}>View details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pid-empty-state"><RadioTower size={32} /><h3>No providers returned</h3><p>The result remains empty. ConnectIQ did not insert a default carrier or generate a quote.</p></div>
            )}

            {report.aiCandidates?.length > 0 && (
              <section className="pid-ai-candidates">
                <div className="pid-panel-heading compact">
                  <div><h2>AI research candidates <span>({report.aiCandidates.length})</span></h2><p>Possible providers only. Official serviceability verification is required.</p></div>
                  <span className="pid-verification-pill unverified"><Sparkles size={13} /> Unverified</span>
                </div>
                <div className="pid-ai-candidate-grid">
                  {report.aiCandidates.map((candidate) => (
                    <article key={candidate.id || candidate.displayName}>
                      <div><strong>{candidate.displayName || candidate.name}</strong><span>{Number(candidate.confidence || 0)}% research confidence</span></div>
                      <p>{candidate.evidence || "Public-source research identified this carrier as a possible option."}</p>
                      <small>Source: {candidate.source || "AI research"}</small>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="pid-data-note"><CircleAlert size={17} /><p><strong>Data-source rule:</strong> static carrier profiles may provide sales metadata, but they never establish address availability. AI research results remain unverified until confirmed through an official serviceability source.</p></div>
          </section>

          <aside className="pid-side-stack">
            <section className="pid-panel pid-recommendation-card">
              <div className="pid-panel-heading compact"><div><h2>Recommendation summary</h2></div><Sparkles size={20} /></div>
              {bestProvider ? (
                <>
                  <span className="pid-overline">Best verified recommendation</span>
                  <div className="pid-recommendation-title"><div><strong>{bestProvider.displayName}</strong><p>{bestProvider.technology} · {formatSpeed(bestProvider.download, bestProvider.upload)}</p></div><span>{providerScore(bestProvider)}/100</span></div>
                  <ul className="pid-reason-list">
                    <li><CheckCircle2 size={15} /> Provider was returned by a verified source.</li>
                    <li><CheckCircle2 size={15} /> Current carrier was excluded where applicable.</li>
                    <li><CheckCircle2 size={15} /> Highest-ranked eligible provider.</li>
                  </ul>
                  <p className="pid-recommendation-copy">{report.recommendation.explanation}</p>
                </>
              ) : (
                <div className="pid-no-recommendation"><AlertTriangle size={28} /><strong>No verified recommendation</strong><p>{report.recommendation.explanation}</p></div>
              )}
            </section>

            <section className="pid-panel pid-detail-card">
              <div className="pid-panel-heading compact"><div><h2>Diagnostic details</h2></div></div>
              <dl className="pid-detail-list">
                <div><dt>Trace ID</dt><dd>{report.trace.id}<button type="button" onClick={() => copyText(report.trace.id)} aria-label="Copy trace ID"><Copy size={13} /></button></dd></div>
                <div><dt>Lookup source</dt><dd>{report.audit.source}</dd></div>
                <div><dt>Lookup status</dt><dd>{report.trace.status}</dd></div>
                <div><dt>Raw providers</dt><dd>{report.audit.providerCount}</dd></div>
                <div><dt>Fallback records</dt><dd>{report.audit.fallbackCount}</dd></div>
                <div><dt>Response time</dt><dd>{report.trace.durationMs} ms</dd></div>
              </dl>
            </section>

            {selectedProvider && (
              <section className="pid-panel pid-detail-card">
                <div className="pid-panel-heading compact"><div><h2>Selected provider</h2></div><button className="pid-close" type="button" onClick={() => setSelectedProvider(null)}>×</button></div>
                <dl className="pid-detail-list">
                  <div><dt>Name</dt><dd>{selectedProvider.displayName}</dd></div>
                  <div><dt>Technology</dt><dd>{selectedProvider.technology}</dd></div>
                  <div><dt>Speed</dt><dd>{formatSpeed(selectedProvider.download, selectedProvider.upload)}</dd></div>
                  <div><dt>Verification</dt><dd>{selectedProvider.verified ? "Verified" : "Unverified"}</dd></div>
                  <div><dt>Source</dt><dd>{selectedProvider.source}</dd></div>
                </dl>
              </section>
            )}
          </aside>
        </div>
      )}

      {report && (
        <section className="pid-panel pid-timeline-panel">
          <div className="pid-panel-heading"><div><h2>Lookup timeline</h2><p>Every step from address receipt through recommendation.</p></div><span className="pid-source-pill">{report.trace.events.length} events</span></div>
          <div className="pid-timeline">
            {report.trace.events.map((event, index) => (
              <div key={`${event.step}-${index}`}>
                <i>{index + 1}</i>
                <div><strong>{event.step.replaceAll("_", " ")}</strong><p>{event.detail}</p></div>
                <time>{new Date(event.at).toLocaleTimeString()}</time>
              </div>
            ))}
          </div>
        </section>
      )}

      {showAudit && (
        <section className="pid-audit-section">
          <div className="pid-panel pid-audit-panel">
            <div className="pid-panel-heading"><div><h2>Dependency inventory</h2><p>Provider-related code paths identified by the audit.</p></div><ChevronDown size={18} /></div>
            <div className="pid-audit-list">{PROVIDER_DEPENDENCIES.map((item) => <article key={item.path}><code>{item.path}</code><span>{item.action}</span><p>{item.risk}</p></article>)}</div>
          </div>
          <div className="pid-panel pid-audit-panel">
            <div className="pid-panel-heading"><div><h2>Architecture decisions</h2><p>Permanent provider-intelligence guardrails.</p></div><ShieldCheck size={18} /></div>
            <div className="pid-adr-list">{ARCHITECTURE_DECISIONS.map((item) => <article key={item.id}><span>{item.id}</span><p>{item.decision}</p></article>)}</div>
          </div>
        </section>
      )}
    </main>
  );
}
