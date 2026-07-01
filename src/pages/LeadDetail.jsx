import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

const STATUSES = ["New Lead", "Contacted", "Appointment Scheduled", "Proposal Sent", "Sold", "Installed", "Lost"];

export default function LeadDetail() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [status, setStatus] = useState("New Lead");
  const [notes, setNotes] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ref = doc(db, "leads", leadId);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setLead(data);
        setStatus(data.status || "New Lead");
        setNotes(data.advisorNotes || "");
      }
    });

    return unsubscribe;
  }, [leadId]);

  async function saveLead() {
    await updateDoc(doc(db, "leads", leadId), {
      status,
      advisorNotes: notes,
      updatedAt: serverTimestamp(),
      activity: arrayUnion({
        type: "update",
        status,
        note: activityNote || "Lead updated",
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

      <div className="admin-heading">
        <span>Customer Record</span>
        <h1>{lead.name || "Unknown Customer"}</h1>
        <p>{lead.email || "No email"} • {lead.phone || "No phone"}</p>
      </div>

      <div className="lead-detail-grid">
        <div className="admin-table-card">
          <h2>Customer Information</h2>

          <div className="detail-list">
            <div><strong>Name</strong><span>{lead.name || "—"}</span></div>
            <div><strong>Email</strong><span>{lead.email || "—"}</span></div>
            <div><strong>Phone</strong><span>{lead.phone || "—"}</span></div>
            <div><strong>Address</strong><span>{lead.address || "—"}</span></div>
            <div><strong>Priority</strong><span>{lead.priority || "—"}</span></div>
            <div><strong>Recommended</strong><span>{lead.recommendedProvider || "—"}</span></div>
          </div>
        </div>

        <div className="admin-table-card">
          <h2>Sales Workflow</h2>

          <label>Status</label>
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>

          <label>Advisor Notes</label>
          <textarea
            className="admin-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Customer needs, objections, next steps..."
          />

          <label>Activity Note</label>
          <input
            className="admin-input"
            value={activityNote}
            onChange={(e) => setActivityNote(e.target.value)}
            placeholder="Example: Called customer and left voicemail"
          />

          <button className="admin-save-button" onClick={saveLead}>Save Updates</button>
          {saved && <div className="save-success">Saved successfully.</div>}
        </div>
      </div>

      <div className="lead-detail-grid">
        <div className="admin-table-card">
          <h2>Available Providers</h2>
          <div className="provider-result-grid">
            {(lead.providers || []).map((provider) => (
              <div className="provider-result-card" key={provider.id}>
                <h4>{provider.name}</h4>
                <p>{provider.technology}</p>
                <span>{provider.download} Mbps down / {provider.upload} Mbps up</span>
                {provider.score && <div className="mini-score">{provider.score}/100 Match</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="admin-table-card">
          <h2>Activity Timeline</h2>
          {activity.length === 0 ? (
            <div className="empty-state">No activity yet.</div>
          ) : (
            <div className="timeline">
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
    </section>
  );
}
