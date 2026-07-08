import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { arrayUnion, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatCurrency, STATUS_FLOW } from "../services/providerIntelligence";
import { summarizeCarrierOptions } from "../services/carrierIntelligenceService";

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

  const carrierSummary = useMemo(() => {
    return summarizeCarrierOptions(lead?.providers || []);
  }, [lead]);

  const bestProvider = carrierSummary.best;
  const activity = [...(lead?.activity || [])].reverse();

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

  async function acceptRecommendation() {
    if (!bestProvider) return;

    await updateDoc(doc(db, "leads", leadId), {
      recommendedProvider: bestProvider.displayName || bestProvider.name,
      recommendationAccepted: true,
      recommendationSnapshot: bestProvider,
      updatedAt: serverTimestamp(),
      activity: arrayUnion({
        type: "Recommendation Accepted",
        status,
        note: `Advisor accepted ConnectIQ recommendation: ${bestProvider.displayName || bestProvider.name}`,
        createdAt: new Date().toISOString(),
      }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  if (!lead) {
    return (
      <section className="sprint9-page">
        <div className="sprint9-panel">Loading customer record...</div>
      </section>
    );
  }

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

      <div className="sprint17-recommendation">
        <span className="eyebrow">ConnectIQ Revenue Recommendation</span>

        {bestProvider ? (
          <>
            <div className="sprint17-rec-header">
              <div>
                <h2>🥇 {bestProvider.displayName || bestProvider.name}</h2>
                <p>{bestProvider.revenueProduct?.productName || "Best available product"}</p>
              </div>
              <div className="sprint17-score">{bestProvider.advisorScore}/100</div>
            </div>

            <div className="sprint17-score-grid">
              <Score label="Overall" value={bestProvider.advisorScore} />
              <Score label="Revenue" value={bestProvider.revenueScore} />
              <Score label="Customer" value={bestProvider.customerScore} />
              <Score label="Weighting" value="70/30" />
            </div>

            <div className="sprint17-info-grid">
              <Info label="Commission" value={formatCurrency(bestProvider.revenueProduct?.commission || bestProvider.commissionResidential || 0)} />
              <Info label="SPIFF" value={formatCurrency(bestProvider.revenueProduct?.spiff || 0)} />
              <Info label="Residual" value={`${formatCurrency(bestProvider.revenueProduct?.residualMonthly || 0)}/mo`} />
              <Info label="Annual Revenue" value={formatCurrency(bestProvider.annualRevenueOpportunity || 0)} />
              <Info label="Technology" value={bestProvider.technology || "—"} />
              <Info label="Speed" value={`${bestProvider.download || "—"} / ${bestProvider.upload || "—"} Mbps`} />
              <Info label="Install ETA" value={bestProvider.installEta || "Unknown"} />
              <Info label="Promotion" value={bestProvider.revenueProduct?.promotion || bestProvider.promotion || "Verify current promo"} />
            </div>

            <div className="sprint17-why">
              <h3>Why ConnectIQ recommends this carrier</h3>
              <ul>
                {bestProvider.revenueScore >= 80 && <li>✓ Strongest revenue opportunity</li>}
                {bestProvider.annualRevenueOpportunity > 0 && <li>✓ {formatCurrency(bestProvider.annualRevenueOpportunity)} estimated first-year revenue</li>}
                {bestProvider.dsiSupported && <li>✓ DSI supported carrier</li>}
                {String(bestProvider.technology).toLowerCase().includes("fiber") && <li>✓ Fiber available at this address</li>}
                {bestProvider.customerScore >= 80 && <li>✓ Strong customer fit based on speed and technology</li>}
              </ul>
            </div>

            <button className="sprint17-recommend-button" onClick={acceptRecommendation}>
              Recommend Carrier
            </button>
            {saved && <div className="save-success">Saved successfully.</div>}
          </>
        ) : (
          <p>No provider recommendation available yet.</p>
        )}
      </div>

      <div className="sprint9-grid-two workspace-grid">
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
          <input className="admin-input" value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="Example: Called customer and discussed provider options" />

          <button className="admin-save-button" onClick={saveLead}>Save Workspace</button>
          {saved && <div className="save-success">Saved successfully.</div>}
        </div>
      </div>

      <div className="sprint9-grid-two workspace-grid">
        <div className="sprint9-panel">
          <span className="eyebrow">Other Carrier Options</span>
          <h2>Ranked Providers</h2>
          <div className="provider-intelligence-grid">
            {carrierSummary.providers.slice(1).map((provider, index) => (
              <div className="provider-intel-card" key={provider.id || provider.name}>
                <div className="provider-intel-top">
                  <h3>#{index + 2} {provider.displayName || provider.name}</h3>
                  <span>{provider.advisorScore}/100</span>
                </div>
                <p>{provider.technology}</p>
                <div className="provider-intel-stats">
                  <div><strong>{provider.revenueScore}</strong><span>Revenue</span></div>
                  <div><strong>{provider.customerScore}</strong><span>Customer</span></div>
                  <div><strong>{formatCurrency(provider.annualRevenueOpportunity || 0)}</strong><span>Annual Rev</span></div>
                  <div><strong>{provider.download || "—"}</strong><span>Mbps Down</span></div>
                </div>
                <small>{provider.revenueProduct?.promotion || provider.promotion || "Advisor should verify current promo."}</small>
              </div>
            ))}
          </div>
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
    </section>
  );
}

function Score({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}
