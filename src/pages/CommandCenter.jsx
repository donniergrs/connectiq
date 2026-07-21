import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowRight, BriefcaseBusiness, CircleDollarSign, Clock3, FileCheck2, PackageCheck, RefreshCw, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { buildCommandCenter } from "../services/commandCenterService";

const currency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
const when = (date) => date ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently";

function Metric({ icon: Icon, label, value, detail }) {
  return <article className="ai010-metric"><Icon size={20}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export default function CommandCenter() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
      setError("");
    }, (snapshotError) => {
      console.error(snapshotError);
      setError("Unable to load Command Center data. Check Firestore access and try again.");
      setLoading(false);
    });
  }, []);

  const center = useMemo(() => buildCommandCenter(leads), [leads]);

  return <section className="ai010-page">
    <header className="ai010-hero">
      <div><span><BriefcaseBusiness size={15}/> AI-010 Command Center</span><h1>Run the complete sales operation from one screen.</h1><p>Customer intelligence, quotes, orders, next actions, pipeline activity, and commission opportunity—connected.</p></div>
      <Link to="/admin/leads">Open all leads <ArrowRight size={16}/></Link>
    </header>

    <div className="ai010-metrics">
      <Metric icon={Users} label="New leads today" value={center.metrics.today} detail={`${center.metrics.total} total leads`}/>
      <Metric icon={Send} label="Quotes sent" value={center.metrics.quotesSent} detail="Customers with quote activity"/>
      <Metric icon={PackageCheck} label="Orders ready" value={center.metrics.ordersReady} detail={`${center.metrics.ordersSubmitted} submitted`}/>
      <Metric icon={CircleDollarSign} label="Commission pipeline" value={currency(center.metrics.commissionPipeline)} detail={`${center.metrics.conversionRate}% submitted conversion`}/>
    </div>

    {error && <div className="ai010-error">{error}</div>}

    <div className="ai010-grid">
      <section className="ai010-panel ai010-queue">
        <header><div><span>Smart action queue</span><h2>What needs attention next</h2></div><Link to="/admin/pipeline">Pipeline</Link></header>
        {loading ? <div className="ai010-loading"><RefreshCw className="is-spinning"/> Loading operation intelligence…</div> : center.queue.length === 0 ? <p className="ai010-empty">No active leads need attention.</p> : center.queue.map((lead) => <article className="ai010-lead" key={lead.id}>
          <div className="ai010-lead-main"><div className="ai010-avatar">{lead.customerName.slice(0,1).toUpperCase()}</div><div><h3>{lead.customerName}</h3><p>{lead.address}</p><small>{lead.provider} · {lead.status}</small></div></div>
          <div className="ai010-readiness"><strong>{lead.readiness || lead.orderIQ?.readinessScore || 0}%</strong><span>ready</span></div>
          <div className="ai010-action"><span>Next best action</span><strong>{lead.nextAction.label}</strong><p>{lead.nextAction.reason}</p></div>
          <Link to={`/admin/leads/${lead.id}`}>Open command workspace <ArrowRight size={15}/></Link>
        </article>)}
      </section>

      <aside className="ai010-panel ai010-activity">
        <header><div><span>Audit trail</span><h2>Recent activity</h2></div><Clock3 size={18}/></header>
        {center.recentActivity.length === 0 ? <p className="ai010-empty">No timeline events have been recorded yet.</p> : center.recentActivity.map((event, index) => <Link to={`/admin/leads/${event.leadId}`} className="ai010-event" key={event.id || index}>
          <i><FileCheck2 size={15}/></i><div><strong>{event.title || event.type || "Lead updated"}</strong><p>{event.customerName}</p><small>{when(event.date)}</small></div>
        </Link>)}
      </aside>
    </div>
  </section>;
}
