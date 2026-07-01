import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function LeadDetail() {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("New Lead");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ref = doc(db, "leads", leadId);

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setLead(data);
        setNotes(data.advisorNotes || "");
        setStatus(data.status || "New Lead");
      }
    });

    return unsubscribe;
  }, [leadId]);

  async function handleSave() {
    await updateDoc(doc(db, "leads", leadId), {
      status,
      advisorNotes: notes,
      updatedAt: serverTimestamp(),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!lead) {
    return <div className="admin-table-card">Loading lead...</div>;
  }

  return (
    <section>
      <Link to="/admin" className="back-link">← Back to Dashboard</Link>

      <div className="admin-heading">
        <span>Lead Detail</span>
        <h1>{lead.name || "Unknown Customer"}</h1>
        <p>{lead.email} • {lead.phone}</p>
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
          <h2>Advisor Workflow</h2>

          <label>Status</label>
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>New Lead</option>
            <option>Contacted</option>
            <option>Appointment Scheduled</option>
            <option>Proposal Sent</option>
            <option>Sold</option>
            <option>Lost</option>
          </select>

          <label>Advisor Notes</label>
          <textarea
            className="admin-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add call notes, customer needs, next steps..."
          />

          <button className="admin-save-button" onClick={handleSave}>
            Save Lead Updates
          </button>

          {saved && <div className="save-success">Saved successfully.</div>}
        </div>
      </div>

      <div className="admin-table-card">
        <h2>Available Providers</h2>

        <div className="provider-result-grid">
          {(lead.providers || []).map((provider) => (
            <div className="provider-result-card" key={provider.id}>
              <h4>{provider.name}</h4>
              <p>{provider.technology}</p>
              <span>{provider.download} Mbps down / {provider.upload} Mbps up</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
