import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { lookupProviders } from "../services/fccService";
import { ARCHITECTURE_DECISIONS, PROVIDER_DEPENDENCIES, runProviderDiagnostic } from "../services/provider-intelligence";

export default function ProviderDiagnostics() {
  const [address, setAddress] = useState("");
  const [currentCarrier, setCurrentCarrier] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setReport(await runProviderDiagnostic({ address, currentCarrier, lookup: lookupProviders, origin: "provider-diagnostics" }));
    setLoading(false);
  }

  return (
    <main className="provider-audit-page">
      <header className="provider-audit-hero">
        <div><span className="eyebrow">Release 5.0.5 RC1</span><h1>Provider Intelligence Audit</h1><p>Trace the exact source, normalization, verification, and recommendation path for an address.</p></div>
        <span className="provider-audit-badge"><ShieldCheck size={18}/> Audit mode</span>
      </header>

      <section className="provider-audit-card">
        <form className="provider-audit-form" onSubmit={submit}>
          <label>Service address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1935 Fort Prince Blvd, Wellford, SC 29385" required /></label>
          <label>Current carrier (optional)<input value={currentCarrier} onChange={(e) => setCurrentCarrier(e.target.value)} placeholder="Spectrum" /></label>
          <button className="primary-button" disabled={loading}><Search size={17}/>{loading ? "Tracing..." : "Run provider trace"}</button>
        </form>
      </section>

      {report && <>
        <section className="provider-audit-kpis">
          <article><span>Trace ID</span><strong>{report.trace.id}</strong><small>{report.trace.durationMs} ms</small></article>
          <article><span>Lookup source</span><strong>{report.audit.source}</strong><small>{report.audit.hasStaticFallback ? "Fallback risk detected" : "No fallback attached"}</small></article>
          <article><span>Raw providers</span><strong>{report.audit.providerCount}</strong><small>{report.audit.fallbackCount} fallback providers</small></article>
          <article><span>Recommendation</span><strong>{report.recommendation.recommendation?.displayName || "None"}</strong><small>{report.recommendation.status}</small></article>
        </section>

        {report.audit.warnings.length > 0 && <section className="provider-audit-warning"><AlertTriangle/><div><strong>Audit findings</strong>{report.audit.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></section>}

        <section className="provider-audit-grid">
          <div className="provider-audit-card"><h2>Normalized verified providers</h2>{report.normalizedProviders.length ? report.normalizedProviders.map((provider) => <div className="provider-audit-provider" key={`${provider.id}-${provider.technology}`}><div><strong>{provider.displayName}</strong><span>{provider.technology}</span></div><div><b>{provider.download || 0}↓ / {provider.upload || 0}↑</b><span>{provider.verified ? "Verified" : "Unverified"} · {provider.source}</span></div></div>) : <p className="muted-copy">No providers were normalized. No recommendation should be generated.</p>}</div>
          <div className="provider-audit-card"><h2>Recommendation decision</h2><div className="provider-audit-decision">{report.recommendation.recommendation ? <CheckCircle2/> : <AlertTriangle/>}<div><strong>{report.recommendation.recommendation?.displayName || "No verified recommendation"}</strong><p>{report.recommendation.explanation}</p>{report.recommendation.alternative && <small>Alternative: {report.recommendation.alternative.displayName}</small>}</div></div></div>
        </section>

        <section className="provider-audit-card"><h2>Lookup timeline</h2><div className="provider-audit-timeline">{report.trace.events.map((event, index) => <div key={`${event.step}-${index}`}><i>{index + 1}</i><div><strong>{event.step.replaceAll("_", " ")}</strong><p>{event.detail}</p><small>{new Date(event.at).toLocaleTimeString()}</small></div></div>)}</div></section>
      </>}

      <section className="provider-audit-grid">
        <div className="provider-audit-card"><h2>Dependency inventory</h2>{PROVIDER_DEPENDENCIES.map((item) => <div className="provider-audit-dependency" key={item.path}><code>{item.path}</code><strong>{item.action}</strong><p>{item.risk}</p></div>)}</div>
        <div className="provider-audit-card"><h2>Architecture decisions</h2>{ARCHITECTURE_DECISIONS.map((item) => <div className="provider-audit-adr" key={item.id}><span>{item.id}</span><p>{item.decision}</p></div>)}</div>
      </section>
    </main>
  );
}
