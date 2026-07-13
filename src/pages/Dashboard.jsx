import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowRight, BriefcaseBusiness, CircleDollarSign, Clock3, FileCheck2, PhoneCall, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { buildAdvisorDashboard } from "../services/advisorDashboard";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function relativeTime(date) {
  if (!date) return "Recently";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MetricCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  return (
    <article className={`advisor-kpi advisor-kpi-${tone}`}>
      <div className="advisor-kpi-icon"><Icon size={21} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function QualityBadge({ quality }) {
  const slug = String(quality || "needs-review").toLowerCase().replace(/\s+/g, "-");
  return <span className={`advisor-quality advisor-quality-${slug}`}>{quality || "Needs Review"}</span>;
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      setError("");
    }, (snapshotError) => {
      console.error(snapshotError);
      setError("Unable to load the advisor lead queue. Check Firestore access and try again.");
      setLoading(false);
    });
  }, []);

  const dashboard = useMemo(() => buildAdvisorDashboard(leads), [leads]);
  const { metrics, priorityQueue, providerMix } = dashboard;

  return (
    <section className="advisor-dashboard-page">
      <header className="advisor-dashboard-hero">
        <div>
          <span className="advisor-eyebrow"><BriefcaseBusiness size={15} /> ConnectIQ Advisor Workspace</span>
          <h1>Start with the leads most likely to convert.</h1>
          <p>AI-qualified opportunities, recommendations, quotes, and next actions in one place.</p>
        </div>
        <div className="advisor-hero-actions">
          <Link to="/admin/leads" className="advisor-secondary-action">View full pipeline</Link>
          <Link to="/internet" className="advisor-primary-action">Open customer advisor <ArrowRight size={17} /></Link>
        </div>
      </header>

      <div className="advisor-kpi-grid">
        <MetricCard icon={Users} label="Today's Leads" value={metrics.today} detail={`${metrics.total} total opportunities`} />
        <MetricCard icon={PhoneCall} label="Ready to Call" value={metrics.readyToCall} detail="High-readiness advisor queue" tone="green" />
        <MetricCard icon={FileCheck2} label="Quotes Generated" value={metrics.quotesGenerated} detail={`${metrics.ordersSubmitted} order-ready`} tone="violet" />
        <MetricCard icon={CircleDollarSign} label="Projected Commission" value={currency(metrics.projectedCommission)} detail="Based on available carrier data" tone="gold" />
      </div>

      {error && <div className="advisor-dashboard-error">{error}</div>}

      <div className="advisor-dashboard-grid">
        <section className="advisor-panel advisor-priority-panel">
          <div className="advisor-panel-heading">
            <div><span>Priority queue</span><h2>Advisor-ready opportunities</h2></div>
            <Link to="/admin/leads">Open all leads</Link>
          </div>

          {loading ? (
            <div className="advisor-loading"><RefreshCw className="is-spinning" /> Loading lead intelligence…</div>
          ) : priorityQueue.length === 0 ? (
            <div className="advisor-empty-state"><Users size={26} /><strong>No leads yet</strong><p>Completed customer journeys will appear here automatically.</p></div>
          ) : (
            <div className="advisor-lead-queue">
              {priorityQueue.map((lead) => (
                <article className="advisor-lead-card" key={lead.id}>
                  <div className="advisor-lead-card-top">
                    <QualityBadge quality={lead.quality} />
                    <span className="advisor-readiness">{lead.readiness || 0}% ready</span>
                  </div>
                  <div className="advisor-lead-person">
                    <div className="advisor-avatar">{String(lead.name || "?").slice(0, 1).toUpperCase()}</div>
                    <div><h3>{lead.name || "Unknown Customer"}</h3><p>{lead.address || lead.email || "No address captured"}</p></div>
                    <small>{relativeTime(lead.createdDate)}</small>
                  </div>
                  <div className="advisor-lead-offer">
                    <div><span>Recommendation</span><strong>{lead.provider}</strong><small>{lead.plan}</small></div>
                    <div><span>Estimate</span><strong>{lead.monthlyPrice ? `${currency(lead.monthlyPrice)}/mo` : "Verify price"}</strong><small>{lead.currentStatus}</small></div>
                  </div>
                  <div className="advisor-lead-next"><span>Next action</span><p>{lead.action}</p></div>
                  <Link to={`/admin/leads/${lead.id}`} className="advisor-open-lead">Open lead workspace <ArrowRight size={16} /></Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="advisor-dashboard-side">
          <section className="advisor-panel">
            <div className="advisor-panel-heading compact"><div><span>Business pulse</span><h2>Pipeline health</h2></div></div>
            <div className="advisor-health-score"><strong>{metrics.averageReadiness}%</strong><span>Average readiness</span></div>
            <div className="advisor-health-list">
              <div><span>Orders submitted</span><strong>{metrics.ordersSubmitted}</strong></div>
              <div><span>Closed / installed</span><strong>{metrics.closed}</strong></div>
              <div><span>Quotes generated</span><strong>{metrics.quotesGenerated}</strong></div>
            </div>
          </section>

          <section className="advisor-panel">
            <div className="advisor-panel-heading compact"><div><span>Recommendation mix</span><h2>Top providers</h2></div></div>
            {providerMix.length === 0 ? <div className="advisor-mini-empty">Provider mix appears after leads are generated.</div> : (
              <div className="advisor-provider-mix">
                {providerMix.map(([provider, count], index) => (
                  <div key={provider}><i>{index + 1}</i><span>{provider}</span><strong>{count}</strong></div>
                ))}
              </div>
            )}
          </section>

          <section className="advisor-panel advisor-next-shift">
            <Clock3 size={22} />
            <div><span>Advisor focus</span><h3>Work high-readiness leads first.</h3><p>Open the queue, confirm current offers, and contact customers while their recommendation is fresh.</p></div>
          </section>
        </aside>
      </div>
    </section>
  );
}
