import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

const COMMISSION_ESTIMATE = {
  "Lumos Fiber": 175,
  "AT&T Fiber": 125,
  Spectrum: 90,
  "T-Mobile Home Internet": 75,
  "Verizon 5G Home": 85,
};

export default function Dashboard() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe;
  }, []);

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const todayLeads = leads.filter((lead) => lead.createdAt?.toDate?.()?.toDateString() === today);
    const newLeads = leads.filter((lead) => !lead.status || lead.status === "New Lead");
    const contacted = leads.filter((lead) => lead.status === "Contacted");
    const sold = leads.filter((lead) => ["Sold", "Installed"].includes(lead.status));
    const followUps = leads.filter((lead) => lead.followUpDate && !["Sold", "Installed", "Lost"].includes(lead.status));
    const conversion = leads.length ? Math.round((sold.length / leads.length) * 100) : 0;
    const pipelineValue = leads.reduce((sum, lead) => sum + (COMMISSION_ESTIMATE[lead.recommendedProvider] || 100), 0);

    return { total: leads.length, today: todayLeads.length, new: newLeads.length, contacted: contacted.length, sold: sold.length, followUps: followUps.length, conversion, pipelineValue };
  }, [leads]);

  const providerCounts = useMemo(() => {
    const counts = {};
    leads.forEach((lead) => {
      const provider = lead.recommendedProvider || "Unassigned";
      counts[provider] = (counts[provider] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leads]);

  return (
    <section>
      <div className="admin-heading executive-heading">
        <span>Executive CRM</span>
        <h1>ConnectIQ Advisor Command Center</h1>
        <p>Track lead flow, customer priorities, provider recommendations, and pipeline value.</p>
      </div>

      <div className="crm-metrics executive-metrics">
        <Metric title="Total Leads" value={metrics.total} />
        <Metric title="Today's Leads" value={metrics.today} />
        <Metric title="New Leads" value={metrics.new} />
        <Metric title="Follow Ups" value={metrics.followUps} />
        <Metric title="Conversion" value={`${metrics.conversion}%`} />
        <Metric title="Pipeline Value" value={`$${metrics.pipelineValue.toLocaleString()}`} />
      </div>

      <div className="crm-split executive-grid">
        <div className="admin-table-card glass-panel">
          <div className="table-header">
            <div>
              <h2>Recent Customer Requests</h2>
              <p>Newest submissions from the public website and contact forms.</p>
            </div>
            <Link to="/admin/leads" className="admin-save-button">Open CRM</Link>
          </div>

          {leads.length === 0 ? (
            <div className="empty-state">No leads yet.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Recommended</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id}>
                    <td><Link to={`/admin/leads/${lead.id}`}>{lead.name || "Unknown"}</Link></td>
                    <td>{formatSource(lead.source)}</td>
                    <td>{lead.recommendedProvider || "—"}</td>
                    <td>{lead.priority || "—"}</td>
                    <td><span className="status-pill">{lead.status || "New Lead"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-table-card glass-panel">
          <h2>Pipeline Snapshot</h2>
          <div className="pipeline-list">
            <Pipeline label="New Lead" count={leads.filter(l => !l.status || l.status === "New Lead").length} />
            <Pipeline label="Contacted" count={leads.filter(l => l.status === "Contacted").length} />
            <Pipeline label="Appointment Scheduled" count={leads.filter(l => l.status === "Appointment Scheduled").length} />
            <Pipeline label="Proposal Sent" count={leads.filter(l => l.status === "Proposal Sent").length} />
            <Pipeline label="Sold" count={leads.filter(l => l.status === "Sold").length} />
            <Pipeline label="Installed" count={leads.filter(l => l.status === "Installed").length} />
          </div>
        </div>
      </div>

      <div className="admin-table-card glass-panel top-provider-card">
        <h2>Top Recommended Providers</h2>
        <div className="provider-metric-grid">
          {providerCounts.length === 0 ? <div className="empty-state">No provider data yet.</div> : providerCounts.map(([provider, count]) => (
            <div className="provider-metric" key={provider}>
              <strong>{provider}</strong>
              <span>{count} lead{count === 1 ? "" : "s"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="admin-card metric-card-v2">
      <h3>{title}</h3>
      <strong>{value}</strong>
    </div>
  );
}

function Pipeline({ label, count }) {
  return (
    <div className="pipeline-row">
      <span>{label}</span>
      <strong>{count}</strong>
    </div>
  );
}

function formatSource(source = "") {
  return source.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Website";
}
