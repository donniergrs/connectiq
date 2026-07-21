import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowRight, Bot, BrainCircuit, CheckCircle2, CircleAlert, GitBranch, Route, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { buildOrchestrationQueue, ORCHESTRATION_AGENTS } from "../services/brainOrchestrationService";

function Metric({ icon: Icon, label, value, detail }) {
  return <article className="ai012-metric"><Icon size={20}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export default function BrainOrchestrator() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLeads(records);
      setSelectedId((current) => current || records[0]?.id || "");
      setLoading(false);
      setError("");
    }, (snapshotError) => {
      console.error(snapshotError);
      setError("Unable to load the orchestration console. Check Firestore access and try again.");
      setLoading(false);
    });
  }, []);

  const engine = useMemo(() => buildOrchestrationQueue(leads), [leads]);
  const filtered = agentFilter === "all" ? engine.queue : engine.queue.filter((lead) => lead.orchestration.agent.id === agentFilter);
  const selected = engine.queue.find((lead) => lead.id === selectedId) || filtered[0] || engine.queue[0];

  return <section className="ai012-page">
    <header className="ai012-hero">
      <div><span><BrainCircuit size={16}/> AI-012 Brain Orchestrator</span><h1>One brain. Specialized agents. One next decision.</h1><p>The orchestration layer evaluates customer facts, provider verification, sales progress, quote status, and order readiness before assigning the next specialized agent.</p></div>
      <Link to="/admin/sales-iq">Open SalesIQ <ArrowRight size={16}/></Link>
    </header>

    <div className="ai012-metrics">
      <Metric icon={Route} label="Leads evaluated" value={engine.metrics.total} detail="Real-time orchestration decisions"/>
      <Metric icon={CircleAlert} label="Human escalations" value={engine.metrics.humanEscalations} detail="Consent or exception review"/>
      <Metric icon={GitBranch} label="Recommendation ready" value={engine.metrics.recommendationReady} detail="Discovery and availability complete"/>
      <Metric icon={CheckCircle2} label="Order agent active" value={engine.metrics.orderActive} detail="Quote created or order progressing"/>
    </div>

    {error && <div className="ai012-error">{error}</div>}

    <section className="ai012-agent-strip">
      {ORCHESTRATION_AGENTS.map((agent) => <button key={agent.id} className={agentFilter === agent.id ? "active" : ""} onClick={() => setAgentFilter(agentFilter === agent.id ? "all" : agent.id)}><Bot size={15}/><span>{agent.label}</span></button>)}
    </section>

    <div className="ai012-grid">
      <section className="ai012-queue">
        <header><div><span>Decision queue</span><h2>Agent assignments</h2></div><small>{filtered.length} displayed</small></header>
        {loading ? <p className="ai012-empty">Loading orchestration decisions…</p> : filtered.length === 0 ? <p className="ai012-empty">No leads are currently assigned to this agent.</p> : <div>{filtered.map((lead) => <button key={lead.id} className={selected?.id === lead.id ? "selected" : ""} onClick={() => setSelectedId(lead.id)}>
          <div><strong>{lead.customerName}</strong><span>{lead.orchestration.agent.label}</span></div>
          <em>{lead.orchestration.state.completeness}% complete</em>
        </button>)}</div>}
      </section>

      <section className="ai012-decision">
        {!selected ? <p className="ai012-empty">Select a lead to inspect the agent decision.</p> : <>
          <header><div><span>Current decision</span><h2>{selected.customerName}</h2></div><Link to={`/admin/leads/${selected.id}`}>Open Lead 360 <ArrowRight size={15}/></Link></header>
          <div className="ai012-assignment"><Sparkles size={24}/><div><small>Assigned agent</small><h3>{selected.orchestration.agent.label}</h3><p>{selected.orchestration.reason}</p></div><strong>{Math.round(selected.orchestration.confidence * 100)}% confidence</strong></div>
          <div className="ai012-next"><small>Next action</small><strong>{selected.orchestration.nextAction}</strong></div>
          <div className="ai012-facts"><div><small>Customer state</small><strong>{selected.orchestration.state.completeness}% complete</strong></div><div><small>Missing facts</small><p>{selected.orchestration.state.missing.join(", ") || "None"}</p></div></div>
          <div className="ai012-plan"><h3>Agent execution plan</h3>{selected.orchestration.steps.map((step, index) => <article key={`${step.agent}-${index}`} className={step.status.toLowerCase()}><span>{index + 1}</span><div><strong>{step.agent}</strong><p>{step.action}</p></div><em>{step.status}</em></article>)}</div>
          <div className="ai012-safeguards"><h3><ShieldCheck size={18}/> Orchestration safeguards</h3>{selected.orchestration.safeguards.map((item) => <p key={item}>{item}</p>)}</div>
        </>}
      </section>
    </div>
  </section>;
}
