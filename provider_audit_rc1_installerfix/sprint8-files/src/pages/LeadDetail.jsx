import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { Mail, Phone } from "lucide-react";
import { db } from "../firebase";

const STATUSES = ["New Lead", "Contacted", "Appointment Scheduled", "Proposal Sent", "Sold", "Installed", "Lost"];

export default function LeadDetail() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [status, setStatus] = useState("New Lead");
  const [notes, setNotes] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ref = doc(db, "leads", leadId);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setLead(data);
        setStatus(data.status || "New Lead");
        setNotes(data.advisorNotes || "");
        setFollowUpDate(data.followUpDate || "");
      }
    });

    return unsubscribe;
  }, [leadId]);

  const bestProvider = useMemo(() => {
    return (lead?.providers || []).sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  }, [lead]);

  async function saveLead() {
    await updateDoc(doc(db, "leads", leadId), {
      status,
      advisorNotes: notes,
      followUpDate,
      updatedAt: serverTimestamp(),
      activity: arrayUnion({
        type: "update",
        status,
        note: activityNote || `Lead updated to ${status}`,
        followUpDate,
        createdAt: new Date().toISOString(),
      }),
    });

    setActivityNote("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (!lead) return <div className="admin-table-card">Loading lead...</div>;

  const activity = [...(lead.activity || [])].reverse();

  return (
    <section>
      <Link to="/admin/leads" className="back-link">← Back to Leads</Link>

      <div className="lead-workspace-hero">
        <div>
          <span>Customer Record</span>
          <h1>{lead.name || "Unknown Customer"}</h1>
          <p>{lead.address || "No address provided"}</p>
        </div>
        <div className="lead-actions">
          {lead.phone && <a href={`tel:${lead.phone}`}><Phone size={17} /> Call</a>}
          {lead.email && <a href={`mailto:${lead.email}`}><Mail size={17} /> Email</a>}
        </div>
      </div>

      <div className="lead-detail-grid">
        <div className="admin-table-card glass-panel">
          <h2>Customer Information</h2>
          <div className="detail-list">
            <div><strong>Name</strong><span>{lead.name || "—"}</span></div>
            <div><strong>Email</strong><span>{lead.email || "—"}</span></div>
            <div><strong>Phone</strong><span>{lead.phone || "—"}</span></div>
            <div><strong>Address</strong><span>{lead.address || "—"}</span></div>
            <div><strong>Priority</strong><span>{lead.priority || "—"}</span></div>
            <div><strong>Lead Source</strong><span>{formatSource(lead.source)}</span></div>
            <div><strong>Recommended</strong><span>{lead.recommendedProvider || bestProvider?.name || "—"}</span></div>
            <div><strong>Follow Up</strong><span>{followUpDate || "Not set"}</span></div>
          </div>
        </div>

        <div className="admin-table-card glass-panel">
          <h2>Sales Workflow</h2>

          <label>Status</label>
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>

          <label>Follow-up Date</label>
          <input className="admin-input" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />

          <label>Advisor Notes</label>
          <textarea className="admin-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Customer needs, objections, next steps..." />

          <label>Activity Note</label>
          <input className="admin-input" value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="Example: Called customer and left voicemail" />

          <button className="admin-save-button" onClick={saveLead}>Save Updates</button>
          {saved && <div className="save-success">Saved successfully.</div>}
        </div>
      </div>

      <div className="lead-detail-grid">
        <div className="admin-table-card glass-panel">
          <h2>Provider Intelligence</h2>
          <div className="provider-result-grid">
            {(lead.providers || []).map((provider) => (
              <div className="provider-result-card provider-intel-card" key={provider.id}>
                <h4>{provider.name}</h4>
                <p>{provider.technology}</p>
                <span>{provider.download} Mbps down / {provider.upload} Mbps up</span>
                {provider.score && <div className="mini-score">{provider.score}/100 Match</div>}
                {provider.installEta && <small>Install ETA: {provider.installEta}</small>}
                {provider.typicalCommission ? <small>Est. Commission: ${provider.typicalCommission}</small> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="admin-table-card glass-panel">
          <h2>Activity Timeline</h2>
          {activity.length === 0 ? <div className="empty-state">No activity yet.</div> : (
            <div className="timeline">
              {activity.map((item, index) => (
                <div className="timeline-item" key={`${item.createdAt}-${index}`}>
                  <strong>{item.status || item.type}</strong>
                  <p>{item.note}</p>
                  {item.followUpDate && <p>Follow up: {item.followUpDate}</p>}
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatSource(source = "") {
  return source.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Website";
}
