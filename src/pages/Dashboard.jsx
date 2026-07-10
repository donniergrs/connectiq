import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { formatCurrency, STATUS_FLOW } from "../services/providerIntelligence";

function leadRevenueOpportunity(lead) {
  const best = Array.isArray(lead.providers) ? lead.providers[0] : null;
  return Number(
    lead.recommendationSnapshot?.annualRevenueOpportunity ||
    best?.annualRevenueOpportunity ||
    best?.revenueProduct?.annualRevenueOpportunity ||
    best?.commission ||
    175
  );
}

function getLeadRecommendationName(lead) {
  const best = Array.isArray(lead.providers) ? lead.providers[0] : null;
  return (
    lead.recommendationSnapshot?.displayName ||
    lead.recommendationSnapshot?.name ||
    lead.recommendedProvider ||
    best?.displayName ||
    best?.name ||
    "Pending Recommendation"
  );
}

function isDateToday(dateString) {
  if (!dateString) return false;
  return dateString === new Date().toISOString().slice(0, 10);
}

function isDateOverdue(dateString) {
  if (!dateString) return false;
  return dateString < new Date().toISOString().slice(0, 10);
}

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
    const dueToday = leads.filter((lead) => isDateToday(lead.followUpDate));
    const overdue = leads.filter((lead) => isDateOverdue(lead.followUpDate));
    const sold = leads.filter((lead) => ["Sale Closed", "Sold", "Installed"].includes(lead.status));
    const revenueOpportunity = leads.reduce((sum, lead) => sum + leadRevenueOpportunity(lead), 0);

    return {
      total: leads.length,
      today: todayLeads.length,
      newLeads: newLeads.length,
      followUps: followUps.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      conversion: leads.length ? Math.round((sold.length / leads.length) * 100) : 0,
      revenueOpportunity,
      sold: sold.length,
    };
  }, [leads]);

  const providerCounts = useMemo(() => {
    const counts = {};
    leads.forEach((lead) => {
      const provider = getLeadRecommendationName(lead);
      counts[provider] = (counts[provider] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [leads]);

  const highestRevenueLeads = useMemo(() => {
    return [...leads]
      .map((lead) => ({
        ...lead,
        revenueOpportunity: leadRevenueOpportunity(lead),
        recommendationName: getLeadRecommendationName(lead),
      }))
      .sort((a, b) => b.revenueOpportunity - a.revenueOpportunity)
      .slice(0, 5);
  }, [leads]);

  const taskQueue = useMemo(() => {
    return [...leads]
      .filter((lead) => lead.followUpDate)
      .map((lead) => ({
        ...lead,
        revenueOpportunity: leadRevenueOpportunity(lead),
        recommendationName: getLeadRecommendationName(lead),
        taskStatus: isDateOverdue(lead.followUpDate) ? "Overdue" : isDateToday(lead.followUpDate) ? "Due Today" : "Upcoming",
      }))
      .sort((a, b) => {
        if (a.taskStatus === "Overdue" && b.taskStatus !== "Overdue") return -1;
        if (a.taskStatus !== "Overdue" && b.taskStatus === "Overdue") return 1;
        return String(a.followUpDate).localeCompare(String(b.followUpDate));
      })
      .slice(0, 8);
  }, [leads]);

  return (
    <section className="sprint9-page">
      <div className="sprint19-hero">
        <div>
          <span className="eyebrow">Advisor Task Center</span>
          <h1>ConnectIQ Advisor Command Center</h1>
          <p>Prioritize today’s follow-ups, overdue leads, and the highest revenue opportunities.</p>
        </div>
        <Link to="/admin/leads" className="sprint9-primary">Work Leads</Link>
      </div>

      <div className="sprint19-metrics">
        <Metric title="Revenue Opportunity" value={formatCurrency(stats.revenueOpportunity)} accent="money" />
        <Metric title="Due Today" value={stats.dueToday} accent="today" />
        <Metric title="Overdue" value={stats.overdue} accent="danger" />
        <Metric title="New Leads" value={stats.newLeads} />
        <Metric title="Conversion" value={`${stats.conversion}%`} />
      </div>

      <div className="sprint19-grid">
        <div className="sprint19-panel sprint19-focus">
          <div className="sprint9-panel-header">
            <div>
              <span className="eyebrow">Highest Revenue</span>
              <h2>Revenue Priority Queue</h2>
            </div>
          </div>

          {highestRevenueLeads.length === 0 ? (
            <div className="empty-state">No revenue opportunities yet.</div>
          ) : (
            <div className="sprint19-opportunity-list">
              {highestRevenueLeads.map((lead, index) => (
                <div className="sprint19-opportunity" key={lead.id}>
                  <div className="sprint19-rank">#{index + 1}</div>
                  <div>
                    <strong>{lead.name || "Unknown Customer"}</strong>
                    <span>{lead.recommendationName}</span>
                    <small>{lead.address || lead.email || "No address captured"}</small>
                  </div>
                  <div className="sprint19-money">{formatCurrency(lead.revenueOpportunity)}</div>
                  <Link to={`/admin/leads/${lead.id}`} className="sprint19-mini-button">Open Lead</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sprint19-panel">
          <div className="sprint9-panel-header">
            <div>
              <span className="eyebrow">Task Queue</span>
              <h2>Follow-Ups</h2>
            </div>
          </div>

          {taskQueue.length === 0 ? (
            <div className="empty-state">No follow-up tasks scheduled.</div>
          ) : (
            <div className="sprint19-task-list">
              {taskQueue.map((lead) => (
                <Link to={`/admin/leads/${lead.id}`} className={`sprint19-task ${lead.taskStatus === "Overdue" ? "is-overdue" : ""}`} key={lead.id}>
                  <div>
                    <strong>{lead.taskStatus}</strong>
                    <span>{lead.name || "Unknown Customer"}</span>
                    <small>{lead.followUpDate} • {lead.recommendationName}</small>
                  </div>
                  <div>{formatCurrency(lead.revenueOpportunity)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
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
                  <strong>{getLeadRecommendationName(lead)}</strong>
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

function Metric({ title, value, accent = "" }) {
  return (
    <div className={`sprint19-metric ${accent ? `is-${accent}` : ""}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}