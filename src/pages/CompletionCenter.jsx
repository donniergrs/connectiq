import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, Loader2, Rocket, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { buildCompletionQueue } from "../services/completionService";

function Metric({ icon: Icon, label, value, detail }) {
  return <article className="ai013-metric"><Icon size={20}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export default function CompletionCenter() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setLeads(rows);
      setSelectedId((current) => current || rows[0]?.id || "");
      setLoading(false);
      setError("");
    }, (err) => {
      console.error(err);
      setError("Unable to load the completion workspace. Check Firestore access and try again.");
      setLoading(false);
    });
  }, []);

  const engine = useMemo(() => buildCompletionQueue(leads), [leads]);
  const selected = engine.queue.find((lead) => lead.id === selectedId) || engine.queue[0];

  async function recordCompletion() {
    if (!selected?.completion.complete || saving) return;
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "leads", selected.id), {
        status: "Completed",
        pipelineStage: "COMPLETED",
        completionStatus: "COMPLETED",
        completionReadiness: 100,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "The completion status could not be saved.");
    } finally { setSaving(false); }
  }

  return <section className="ai013-page">
    <header className="ai013-hero">
      <div><span><Rocket size={16}/> AI-013 Completion</span><h1>Finish every sale with evidence, safeguards, and a clean handoff.</h1><p>The Completion Center validates the full customer journey, exposes the remaining blockers, and records a completed transaction only after every production gate passes.</p></div>
      <Link to="/admin/brain-orchestrator">Open Brain Orchestrator <ArrowRight size={16}/></Link>
    </header>

    <div className="ai013-metrics">
      <Metric icon={ClipboardCheck} label="Transactions" value={engine.metrics.total} detail="Leads evaluated in real time"/>
      <Metric icon={CheckCircle2} label="Completed" value={engine.metrics.complete} detail="All completion gates passed"/>
      <Metric icon={CircleAlert} label="Final review" value={engine.metrics.finalReview} detail="At least 75% ready"/>
      <Metric icon={ShieldCheck} label="Average readiness" value={`${engine.metrics.averageReadiness}%`} detail={`${engine.metrics.blocked} currently blocked`}/>
    </div>

    {error && <div className="ai013-error">{error}</div>}

    <div className="ai013-grid">
      <section className="ai013-queue">
        <header><div><span>Completion queue</span><h2>Transaction readiness</h2></div><small>{engine.queue.length} leads</small></header>
        {loading ? <p className="ai013-empty"><Loader2 className="spin"/> Loading completion records…</p> : engine.queue.length === 0 ? <p className="ai013-empty">No leads are available for completion review.</p> : <div>{engine.queue.map((lead) => <button key={lead.id} className={selected?.id === lead.id ? "selected" : ""} onClick={() => setSelectedId(lead.id)}><div><strong>{lead.customerName}</strong><span>{lead.completion.completionStatus}</span></div><em>{lead.completion.readiness}%</em></button>)}</div>}
      </section>

      <section className="ai013-review">
        {!selected ? <p className="ai013-empty">Select a lead to review completion.</p> : <>
          <header><div><span>Production gate review</span><h2>{selected.customerName}</h2></div><Link to={`/admin/leads/${selected.id}`}>Open Lead 360 <ArrowRight size={15}/></Link></header>
          <div className={`ai013-status ${selected.completion.complete ? "complete" : "pending"}`}><div><small>Completion status</small><h3>{selected.completion.completionStatus}</h3><p>{selected.completion.complete ? "All evidence is present. This transaction can be recorded as completed." : `${selected.completion.blockers.length} gate(s) remain before completion.`}</p></div><strong>{selected.completion.readiness}%</strong></div>
          <div className="ai013-next"><small>Next required action</small><strong>{selected.completion.nextAction}</strong></div>
          <div className="ai013-gates">{selected.completion.gates.map((gate) => <article key={gate.id} className={gate.passed ? "passed" : "failed"}>{gate.passed ? <CheckCircle2 size={20}/> : <CircleAlert size={20}/>}<div><strong>{gate.label}</strong><p>{gate.detail}</p></div><em>{gate.passed ? "PASS" : "REQUIRED"}</em></article>)}</div>
          <div className="ai013-handoff"><h3><ShieldCheck size={18}/> Completion safeguards</h3><p>Provider claims must remain address verified. Customer consent must be respected. Order submission must be recorded before the transaction is marked complete.</p><div><span>Assigned agent</span><strong>{selected.completion.orchestration.agent.label}</strong></div><div><span>Orchestrator action</span><strong>{selected.completion.orchestration.nextAction}</strong></div></div>
          <div className="ai013-actions"><Link to={`/admin/leads/${selected.id}`}>Resolve in Lead 360</Link><button disabled={!selected.completion.complete || saving} onClick={recordCompletion}>{saving ? "Saving…" : "Record Completion"}</button></div>
        </>}
      </section>
    </div>
  </section>;
}
