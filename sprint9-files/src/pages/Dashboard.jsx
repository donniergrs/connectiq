import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { formatCurrency, STATUS_FLOW } from "../services/providerIntelligence";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLeads = leads.filter((lead) => lead.createdAt?.toDate?.()?.toDateString() === today);
    const newLeads = leads.filter((lead) => !lead.status || lead.status === "New Lead");
    const followUps = leads.filter((lead) => lead.followUpDate);
    const sold = leads.filter((lead) => ["Sale Closed", "Sold", "Installed"].includes(lead.status));
    const pipelineValue = leads.reduce((sum, lead) => {
      const best = Array.isArray(lead.providers) ? lead.providers[0] : null;
      return sum + Number(best?.commission || 175);
    }, 0);

    return {
      total: leads.length,
      today: todayLeads.length,
      newLeads: newLeads.length,
      followUps: followUps.length,
      conversion: leads.length ? Math.round((sold.length / leads.length) * 100) : 0,
      pipelineValue,
      sold: sold.length,
    };
  }, [leads]);

  const providerCounts = useMemo(() => {
    const counts = {};
    leads.forEach((lead) => {
      const provider = lead.recommendedProvider || "Unknown";
      counts[provider] = (counts[provider] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leads]);

  return (
    <section className="sprint9-page">
      <div className="sprint9-hero-card">
        <div>
          <span className="eyebrow">Executive CRM</span>
          <h1>ConnectIQ Advisor Command Center</h1>
          <p>Track lead flow, customer priorities, provider recommendations, and pipeline value.</p>
        </div>
        <Link to="/admin/leads" className="sprint9-primary">Work Leads</Link>
      </div>

      <div className="sprint9-metrics">
        <Metric title="Total Leads" value={stats.total} />
        <Metric title="Today's Leads" value={stats.today} />
        <Metric title="New Leads" value={stats.newLeads} />
        <Metric title="Follow Ups" value={stats.followUps} />
        <Metric title="Conversion" value={`${stats.conversion}%`} />
        <Metric title="Pipeline Value" value={formatCurrency(stats.pipelineValue)} />
      </div>

      <div className="sprint9-grid-two">
        <div className="sprint9-panel">
          <div className="sprint9-panel-header">
            <div>
              <span className="eyebrow">Pipeline</span>
              <h2>Status Distribution</h2>
            </div>
          </div>
          <div className="sprint9-pipeline-bars">
            {STATUS_FLOW.filter((s) => s !== "Lost").map((status) => {
              const count = leads.filter((lead) => (lead.status || "New Lead") === status).length;
              const width = leads.length ? Math.max(8, Math.round((count / leads.length) * 100)) : 8;
              return (
                <div className="pipeline-bar-row" key={status}>
                  <div className="pipeline-bar-label"><span>{status}</span><strong>{count}</strong></div>
                  <div className="pipeline-bar-track"><div style={{ width: `${width}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sprint9-panel">
          <div className="sprint9-panel-header">
            <div>
              <span className="eyebrow">Providers</span>
              <h2>Top Recommendations</h2>
            </div>
          </div>
          <div className="provider-rank-list">
            {providerCounts.length === 0 ? <div className="empty-state">No provider data yet.</div> : providerCounts.map(([name, count]) => (
              <div className="provider-rank" key={name}>
                <span>{name}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sprint9-panel">
        <div className="sprint9-panel-header">
          <div>
            <span className="eyebrow">Recent Activity</span>
            <h2>Newest Leads</h2>
          </div>
          <Link to="/admin/leads">View All</Link>
        </div>

        {leads.length === 0 ? <div className="empty-state">No leads yet.</div> : (
          <div className="sprint9-lead-list">
            {leads.slice(0, 8).map((lead) => (
              <Link to={`/admin/leads/${lead.id}`} className="sprint9-lead-row" key={lead.id}>
                <div>
                  <strong>{lead.name || "Unknown Customer"}</strong>
                  <span>{lead.address || lead.email || "No address"}</span>
                </div>
                <div>
                  <strong>{lead.recommendedProvider || "Pending"}</strong>
                  <span>{lead.priority || "No priority"}</span>
                </div>
                <span className="sprint9-status">{lead.status || "New Lead"}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="sprint9-metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
