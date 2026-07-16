import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { arrayUnion, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatCurrency, STATUS_FLOW } from "../services/providerIntelligence";

export default function LeadDetail() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [status, setStatus] = useState("New Lead");
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ref = doc(db, "leads", leadId);
    return onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setLead(data);
        setStatus(data.status || "New Lead");
        setAdvisorNotes(data.advisorNotes || "");
        setFollowUpDate(data.followUpDate || "");
      }
    });
  }, [leadId]);

  const bestProvider = useMemo(() => {
    return Array.isArray(lead?.providers) ? lead.providers[0] : null;
  }, [lead]);

  async function saveLead() {
    await updateDoc(doc(db, "leads", leadId), {
      status,
      advisorNotes,
      followUpDate,
      updatedAt: serverTimestamp(),
      activity: arrayUnion({
        type: "Advisor Update",
        status,
        note: activityNote || `Status updated to ${status}`,
        createdAt: new Date().toISOString(),
      }),
    });

    setActivityNote("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (!lead) return <section className="sprint9-page"><div className="sprint9-panel">Loading customer record...</div></section>;

  const activity = [...(lead.activity || [])].reverse();

  return (
    <section className="sprint9-page">
      <Link to="/admin/leads" className="back-link">← Back to Leads</Link>

      <div className="lead-workspace-hero">
        <div>
          <span className="eyebrow">Lead Workspace</span>
          <h1>{lead.name || "Unknown Customer"}</h1>
          <p>{lead.address || "No address captured"}</p>
        </div>
        <div className="workspace-actions">
          {lead.phone && <a href={`tel:${lead.phone}`} className="sprint9-primary">Call Customer</a>}
          {lead.email && <a href={`mailto:${lead.email}`} className="sprint9-secondary">Email</a>}
        </div>
      </div>

      <div className="sprint9-grid-two workspace-grid">
        <div className="sprint9-panel recommendation-focus">
          <span className="eyebrow">ConnectIQ Recommendation</span>
          <h2>{bestProvider?.name || lead.recommendedProvider || "Pending Recommendation"}</h2>
          {bestProvider && <div className="big-score">{bestProvider.score || 95}/100</div>}
          <p>{bestProvider?.connectIqRecommendation || "Best available match based on customer priority and provider intelligence."}</p>
          <div className="recommendation-meta">
            <span>{bestProvider?.technology || "Technology pending"}</span>
            <span>{bestProvider?.download || "—"} Mbps down</span>
            <span>{bestProvider?.upload || "—"} Mbps up</span>
            <span>{formatCurrency(bestProvider?.commission || 175)} est. commission</span>
          </div>
          <ul className="reason-list">
            {(bestProvider?.reasons || []).map((reason) => <li key={reason}>✓ {reason}</li>)}
          </ul>
        </div>

        <div className="sprint9-panel">
          <span className="eyebrow">Customer</span>
          <div className="detail-list sprint9-detail-list">
            <div><strong>Name</strong><span>{lead.name || "—"}</span></div>
            <div><strong>Email</strong><span>{lead.email || "—"}</span></div>
            <div><strong>Phone</strong><span>{lead.phone || "—"}</span></div>
            <div><strong>Priority</strong><span>{lead.priority || "—"}</span></div>
            <div><strong>Status</strong><span>{lead.status || "New Lead"}</span></div>
            <div><strong>Follow Up</strong><span>{lead.followUpDate || "Not set"}</span></div>
          </div>
        </div>
      </div>

      <div className="sprint9-grid-two workspace-grid">
        <div className="sprint9-panel">
          <span className="eyebrow">Advisor Workflow</span>
          <h2>Update Lead</h2>

          <label>Status</label>
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FLOW.map((item) => <option key={item}>{item}</option>)}
          </select>

          <label>Follow-up Date</label>
          <input className="admin-input" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />

          <label>Advisor Notes</label>
          <textarea className="admin-textarea" value={advisorNotes} onChange={(e) => setAdvisorNotes(e.target.value)} placeholder="Customer objections, current provider, desired speed, next steps..." />

          <label>Activity Note</label>
          <input className="admin-input" value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="Example: Called customer and discussed Lumos Fiber" />

          <button className="admin-save-button" onClick={saveLead}>Save Workspace</button>
          {saved && <div className="save-success">Saved successfully.</div>}
        </div>

        <div className="sprint9-panel">
          <span className="eyebrow">Timeline</span>
          <h2>Activity</h2>
          {activity.length === 0 ? <div className="empty-state">No activity yet.</div> : (
            <div className="timeline sprint9-timeline">
              {activity.map((item, index) => (
                <div className="timeline-item" key={`${item.createdAt}-${index}`}>
                  <strong>{item.status || item.type}</strong>
                  <p>{item.note}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sprint9-panel">
        <span className="eyebrow">Carrier Intelligence</span>
        <h2>Available Providers</h2>
        <div className="provider-intelligence-grid">
          {(lead.providers || []).map((provider) => (
            <div className="provider-intel-card" key={provider.id || provider.name}>
              <div className="provider-intel-top">
                <h3>{provider.name}</h3>
                <span>{provider.score || 80}/100</span>
              </div>
              <p>{provider.technology}</p>
              <div className="provider-intel-stats">
                <div><strong>{provider.download}</strong><span>Mbps Down</span></div>
                <div><strong>{provider.upload}</strong><span>Mbps Up</span></div>
                <div><strong>{provider.latencyMs || "—"}</strong><span>ms Latency</span></div>
                <div><strong>{formatCurrency(provider.commission || 100)}</strong><span>Commission</span></div>
              </div>
              <small>{provider.promo || "Advisor should verify current promo."}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
