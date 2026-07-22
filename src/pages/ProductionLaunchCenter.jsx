import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Loader2, Rocket, ShieldCheck, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { buildDsiSubmissionPackage, buildLaunchReadiness, dsiPackageToCsv } from "../services/productionLaunchService";

const firebaseConfig = {
  apiKey: "AIzaSyDGnGuLpveq8hIzZ-lqTiusUv1uwBrLD0U",
  projectId: "connectiq-8a7e3",
  appId: "1:992918619087:web:3b94cbfdfe9aab646d08ba",
};

function download(name, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Metric({ label, value, detail }) {
  return <article className="ai014-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export default function ProductionLaunchCenter() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setLeads(rows);
      setSelectedId((value) => value || rows[0]?.id || "");
      setConnected(true);
      setLoading(false);
      setError("");
    }, (err) => {
      console.error(err);
      setConnected(false);
      setLoading(false);
      setError("Production Firestore validation failed. Confirm authentication, rules, and project configuration.");
    });
  }, []);

  const engine = useMemo(() => buildLaunchReadiness({
    leads,
    config: firebaseConfig,
    firestoreConnected: connected,
    domain: window.location.hostname,
    online: navigator.onLine,
  }), [leads, connected]);

  const exportable = engine.orderReady;
  const selected = exportable.find((lead) => lead.id === selectedId) || exportable[0];

  function exportJson() {
    if (!selected) return;
    const pkg = buildDsiSubmissionPackage(selected);
    download(`connectiq-dsi-${selected.id}.json`, JSON.stringify(pkg, null, 2), "application/json");
  }

  function exportCsv() {
    if (!selected) return;
    const pkg = buildDsiSubmissionPackage(selected);
    download(`connectiq-dsi-${selected.id}.csv`, dsiPackageToCsv(pkg), "text/csv");
  }

  return <section className="ai014-page">
    <header className="ai014-hero">
      <div><span><Rocket size={16}/> AI-014 Production Launch</span><h1>Turn the completed platform into the first ConnectIQ commission.</h1><p>Validate the production environment, prove the complete customer journey, export a DSI-ready package, and expose failures before they cost a sale.</p></div>
      <a href="/advisor" target="_blank" rel="noreferrer">Run customer test <ExternalLink size={16}/></a>
    </header>

    <div className={`ai014-banner ${engine.launchReady ? "ready" : "blocked"}`}>
      {engine.launchReady ? <ShieldCheck size={28}/> : <AlertTriangle size={28}/>}<div><small>Production launch status</small><h2>{engine.launchReady ? "READY FOR CONTROLLED LAUNCH" : "LAUNCH BLOCKED"}</h2><p>{engine.nextAction}</p></div><strong>{engine.score}%</strong>
    </div>

    <div className="ai014-metrics">
      <Metric label="Production leads" value={engine.metrics.totalLeads} detail="Live Firestore records"/>
      <Metric label="Journey complete" value={engine.metrics.completed} detail="All AI-013 gates passed"/>
      <Metric label="Order ready" value={engine.metrics.orderReady} detail="Available for DSI export"/>
      <Metric label="Exceptions" value={engine.metrics.failed} detail="Failed or rejected transactions"/>
      <Metric label="Submitted" value={engine.metrics.submitted} detail="Recorded submission outcomes"/>
    </div>

    {error && <div className="ai014-error">{error}</div>}

    <div className="ai014-grid">
      <section className="ai014-panel">
        <header><div><span>Launch checklist</span><h2>Production gates</h2></div><Wifi size={20}/></header>
        {loading ? <p className="ai014-empty"><Loader2 className="spin"/> Validating production…</p> : <div className="ai014-gates">{engine.gates.map((gate) => <article key={gate.id} className={gate.passed ? "passed" : "failed"}>{gate.passed ? <CheckCircle2/> : <AlertTriangle/>}<div><strong>{gate.label}</strong><p>{gate.detail}</p></div><em>{gate.critical ? "REQUIRED" : "TRACK"}</em></article>)}</div>}
      </section>

      <section className="ai014-panel">
        <header><div><span>DSI handoff</span><h2>Submission package</h2></div><Download size={20}/></header>
        {exportable.length === 0 ? <p className="ai014-empty">No order-ready leads are available. Complete the missing OrderIQ and Completion Center gates first.</p> : <>
          <div className="ai014-select">{exportable.map((lead) => <button key={lead.id} className={selected?.id === lead.id ? "selected" : ""} onClick={() => setSelectedId(lead.id)}><strong>{lead.customerName || lead.name || "Customer"}</strong><span>{lead.recommendedProvider || lead.selectedProvider || "Provider pending"}</span></button>)}</div>
          {selected && <div className="ai014-package"><div><span>Customer</span><strong>{selected.customerName || selected.name || "Customer"}</strong></div><div><span>Service address</span><strong>{selected.address || selected.serviceAddress || "Missing"}</strong></div><div><span>Provider</span><strong>{selected.recommendedProvider || selected.selectedProvider || "Missing"}</strong></div><div><span>Readiness</span><strong>{selected.completion.readiness}%</strong></div></div>}
          <div className="ai014-actions"><button onClick={exportCsv}><Download size={15}/> Export CSV</button><button onClick={exportJson}><Download size={15}/> Export JSON</button><Link to={`/admin/leads/${selected?.id}`}>Open Lead 360</Link></div>
        </>}
      </section>
    </div>

    <section className="ai014-panel ai014-exceptions"><header><div><span>Revenue protection</span><h2>Failed transaction visibility</h2></div><AlertTriangle size={20}/></header>{engine.failed.length === 0 ? <p className="ai014-empty">No failed transactions are currently detected.</p> : <div>{engine.failed.map((lead) => <Link key={lead.id} to={`/admin/leads/${lead.id}`}><strong>{lead.customerName || lead.name || lead.id}</strong><span>{lead.status || lead.pipelineStage || "Exception detected"}</span></Link>)}</div>}</section>
  </section>;
}
