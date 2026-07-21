import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowRight, Bot, CalendarClock, Copy, Flame, MessageSquareText, PackageCheck, RefreshCw, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { buildSalesIQ } from "../services/salesIQService";

function Metric({ icon: Icon, label, value, detail }) {
  return <article className="ai011-metric"><Icon size={20}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export default function SalesIQ() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      setError("");
    }, (snapshotError) => {
      console.error(snapshotError);
      setError("Unable to load SalesIQ. Check Firestore access and try again.");
      setLoading(false);
    });
  }, []);

  const salesIQ = useMemo(() => buildSalesIQ(leads), [leads]);
  const queue = filter === "ALL" ? salesIQ.queue : salesIQ.queue.filter((lead) => lead.stage === filter);

  const copyMessage = async (lead) => {
    await navigator.clipboard.writeText(lead.followUpMessage);
    setCopied(lead.id);
    window.setTimeout(() => setCopied(""), 1800);
  };

  return <section className="ai011-page">
    <header className="ai011-hero">
      <div><span><Bot size={15}/> AI-011 SalesIQ</span><h1>Move every qualified customer toward an order.</h1><p>Opportunity scoring, sales playbooks, quote follow-up, objection recovery, and next-best actions—organized in one conversion queue.</p></div>
      <Link to="/admin/command-center">Command Center <ArrowRight size={16}/></Link>
    </header>

    <div className="ai011-metrics">
      <Metric icon={Target} label="Active opportunities" value={salesIQ.metrics.active} detail="Open sales conversations"/>
      <Metric icon={Flame} label="Hot opportunities" value={salesIQ.metrics.hot} detail="Opportunity score 70+"/>
      <Metric icon={MessageSquareText} label="Quote follow-ups" value={salesIQ.metrics.quoteFollowUps} detail="Customers awaiting a close"/>
      <Metric icon={PackageCheck} label="Orders ready" value={salesIQ.metrics.orderReady} detail={`${salesIQ.metrics.stale} opportunities need re-engagement`}/>
    </div>

    {error && <div className="ai011-error">{error}</div>}

    <section className="ai011-panel">
      <header className="ai011-panel-head"><div><span>Autonomous sales queue</span><h2>Highest-value opportunities first</h2></div><div className="ai011-filters">{["ALL", "DISCOVERY", "RECOMMENDATION", "CLOSING", "FOLLOW_UP", "ORDER_READY"].map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item.replace("_", " ")}</button>)}</div></header>
      {loading ? <div className="ai011-loading"><RefreshCw className="is-spinning"/> Loading SalesIQ intelligence…</div> : queue.length === 0 ? <p className="ai011-empty">No opportunities match this stage.</p> : <div className="ai011-list">{queue.map((lead) => <article className="ai011-card" key={lead.id}>
        <div className="ai011-score"><strong>{lead.opportunityScore}</strong><span>Opportunity</span></div>
        <div className="ai011-customer"><div><span className="ai011-stage">{lead.stage.replace("_", " ")}</span><h3>{lead.customerName}</h3><p>{lead.address}</p></div><div className="ai011-playbook"><small>Active playbook</small><strong>{lead.playbook.label}</strong></div></div>
        <div className="ai011-action"><small>Next best action</small><strong>{lead.nextAction.label}</strong><p>{lead.nextAction.reason}</p></div>
        <div className="ai011-message"><small>Suggested follow-up</small><p>{lead.followUpMessage}</p><button onClick={() => copyMessage(lead)}><Copy size={14}/>{copied === lead.id ? "Copied" : "Copy message"}</button></div>
        <div className="ai011-card-actions"><Link to={`/admin/leads/${lead.id}`}>Open Lead 360 <ArrowRight size={15}/></Link><span><CalendarClock size={14}/> Resume from {lead.stage.replace("_", " ").toLowerCase()}</span></div>
      </article>)}</div>}
    </section>
  </section>;
}
