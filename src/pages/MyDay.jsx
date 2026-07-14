import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowRight, CalendarClock, CircleDollarSign, ClockAlert, Flame, RefreshCw, Sparkles, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { buildMyDay, buildSalesCoach } from "../services/aiSalesIntelligence";

function currency(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0); }
function Metric({ icon: Icon, label, value, detail }) { return <article className="ai503-metric"><Icon size={19}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>; }

export default function MyDay() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => { setLeads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); setLoading(false); }, (err) => { console.error(err); setError("Unable to load your advisor workspace."); setLoading(false); });
  }, []);
  const day = useMemo(() => buildMyDay(leads, user), [leads, user]);
  const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Advisor";
  return <section className="ai503-page">
    <header className="ai503-hero"><div><span><Sparkles size={15}/> AI Sales Intelligence</span><h1>Good morning, {firstName}.</h1><p>Your highest-value work is organized and explained so you can start selling immediately.</p></div><Link to="/admin/pipeline" className="advisor-secondary-action">Open pipeline</Link></header>
    <div className="ai503-metrics"><Metric icon={CalendarClock} label="Due today" value={day.dueToday} detail="Scheduled follow-ups"/><Metric icon={ClockAlert} label="Overdue" value={day.overdue} detail="Requires immediate attention"/><Metric icon={UserPlus} label="New assignments" value={day.newAssigned} detail="Added in the last 24 hours"/><Metric icon={CircleDollarSign} label="Forecast MRR" value={currency(day.forecastMRR)} detail={`${currency(day.pipelineValue)} active pipeline`}/></div>
    {error && <div className="pipeline503-error">{error}</div>}
    <div className="ai503-grid"><section className="ai503-panel ai503-work"><header><div><Flame size={19}/><span>Work Next</span></div><small>Ranked by urgency, readiness, fit, value, and inactivity</small></header>{loading ? <div className="pipeline503-state"><RefreshCw className="is-spinning"/> Loading priorities…</div> : day.queue.length ? day.queue.map((lead, index) => { const coach = buildSalesCoach(lead); return <Link to={`/admin/leads/${lead.id}`} key={lead.id} className="ai503-work-card"><strong>{index + 1}</strong><div><h3>{lead.name}</h3><p>{lead.provider} · {lead.plan}</p><span>{lead.priorityReasons.join(" · ")}</span></div><aside><b>{lead.priorityScore}</b><small>{coach.closeProbability}% close</small><ArrowRight size={16}/></aside></Link>; }) : <p className="lead502-muted">No active assigned leads are available.</p>}</section>
      <aside className="ai503-panel"><header><div><Sparkles size={19}/><span>Today’s focus</span></div></header><div className="ai503-focus"><strong>{day.highPriority}</strong><span>high-priority opportunities</span></div><div className="ai503-focus"><strong>{day.ownedCount}</strong><span>assigned leads</span></div><p>Start at the top of Work Next. ConnectIQ explains why each opportunity is prioritized, while you remain in control of every decision.</p></aside></div>
  </section>;
}
