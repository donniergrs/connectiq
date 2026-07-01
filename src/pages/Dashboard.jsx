import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe;
  }, []);

  const today = new Date().toDateString();

  const metrics = useMemo(() => {
    const todayLeads = leads.filter((lead) => lead.createdAt?.toDate?.()?.toDateString() === today);
    const newLeads = leads.filter((lead) => !lead.status || lead.status === "New Lead");
    const sold = leads.filter((lead) => lead.status === "Sold" || lead.status === "Installed");
    const contacted = leads.filter((lead) => lead.status === "Contacted");
    const conversion = leads.length ? Math.round((sold.length / leads.length) * 100) : 0;

    return {
      total: leads.length,
      today: todayLeads.length,
      new: newLeads.length,
      contacted: contacted.length,
      sold: sold.length,
      conversion,
    };
  }, [leads, today]);

  return (
    <section>
      <div className="admin-heading">
        <span>Advisor Portal</span>
        <h1>ConnectIQ CRM</h1>
        <p>Manage customer requests, recommendations, follow-ups, and sales pipeline.</p>
      </div>

      <div className="crm-metrics">
        <Metric title="Total Leads" value={metrics.total} />
        <Metric title="Today's Leads" value={metrics.today} />
        <Metric title="New Leads" value={metrics.new} />
        <Metric title="Contacted" value={metrics.contacted} />
        <Metric title="Closed / Installed" value={metrics.sold} />
        <Metric title="Conversion Rate" value={`${metrics.conversion}%`} />
      </div>

      <div className="crm-split">
        <div className="admin-table-card">
          <div className="table-header">
            <div>
              <h2>Recent Leads</h2>
              <p>Newest customer submissions from the public website.</p>
            </div>
            <Link to="/admin/leads" className="admin-save-button">View All Leads</Link>
          </div>

          {leads.length === 0 ? (
            <div className="empty-state">No leads yet.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Recommended</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id}>
                    <td><Link to={`/admin/leads/${lead.id}`}>{lead.name || "Unknown"}</Link></td>
                    <td>{lead.recommendedProvider || "—"}</td>
                    <td>{lead.priority || "—"}</td>
                    <td><span className="status-pill">{lead.status || "New Lead"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-table-card">
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
    </section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="admin-card">
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
