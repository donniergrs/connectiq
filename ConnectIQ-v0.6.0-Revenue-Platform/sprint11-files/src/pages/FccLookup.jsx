import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { lookupFccProviders, runFccDiagnostic } from "../services/fccAdminService";

export default function FccLookup() {
  const [address, setAddress] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [leads, setLeads] = useState([]);
  const [diagnostic, setDiagnostic] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  async function handleDiagnostic() {
    setError("");
    try {
      const data = await runFccDiagnostic();
      setDiagnostic(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await lookupFccProviders(address);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveToLead() {
    if (!selectedLeadId || !result) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "leads", selectedLeadId), {
        fccLookup: result,
        providers: result.providers || [],
        recommendedProvider: result.providers?.[0]?.name || "",
        updatedAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="admin-heading">
        <span>Carrier Intelligence</span>
        <h1>FCC Live Lookup</h1>
        <p>Authenticate to FCC, geocode an address, and return provider intelligence for advisor review.</p>
      </div>

      <div className="fcc-grid">
        <div className="admin-table-card">
          <h2>FCC Status</h2>
          <p className="muted-copy">Confirm backend FCC authentication before running live address lookups.</p>
          <button className="admin-save-button" onClick={handleDiagnostic}>Run FCC Diagnostic</button>

          {diagnostic && (
            <div className="fcc-status-card">
              <div><strong>Status</strong><span className={diagnostic.ok ? "good" : "warn"}>{diagnostic.ok ? "Authenticated" : "Needs attention"}</span></div>
              <div><strong>Username</strong><span>{diagnostic.username || "—"}</span></div>
              <div><strong>Token Length</strong><span>{diagnostic.hashLength || 0}</span></div>
              <div><strong>As Of Status</strong><span>{diagnostic.asOf?.status || "—"}</span></div>
            </div>
          )}
        </div>

        <div className="admin-table-card">
          <h2>Run Address Lookup</h2>
          <form className="fcc-form" onSubmit={handleLookup}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="101 Plum Creek Ln Greenville SC 29607" required />
            <button className="admin-save-button" type="submit" disabled={loading}>{loading ? "Searching..." : "Lookup Providers"}</button>
          </form>

          <label>Attach result to lead</label>
          <select className="admin-input" value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)}>
            <option value="">Select a lead...</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.name || "Unknown"} — {lead.address || lead.email || lead.phone}</option>
            ))}
          </select>
          <button className="admin-save-button secondary" onClick={saveToLead} disabled={!selectedLeadId || !result || saving}>{saving ? "Saving..." : "Save Lookup to Lead"}</button>
        </div>
      </div>

      {error && <div className="funnel-error">{error}</div>}

      {result && (
        <div className="admin-table-card fcc-results-card">
          <div className="table-header">
            <div>
              <h2>Provider Results</h2>
              <p>{result.message}</p>
            </div>
            <span className="status-pill">Source: {result.source}</span>
          </div>

          {result.geocode && (
            <div className="fcc-geocode">
              <strong>Matched Address:</strong> {result.geocode.matchedAddress || "—"}
              <span>Lat: {result.geocode.latitude || "—"}</span>
              <span>Lng: {result.geocode.longitude || "—"}</span>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Provider</th>
                <th>Technology</th>
                <th>Download</th>
                <th>Upload</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {(result.providers || []).map((provider, index) => (
                <tr key={provider.id || `${provider.name}-${index}`}>
                  <td>{index === 0 ? "⭐ #1" : `#${index + 1}`}</td>
                  <td>{provider.name}</td>
                  <td>{provider.technology}</td>
                  <td>{provider.download} Mbps</td>
                  <td>{provider.upload} Mbps</td>
                  <td><span className="mini-score">{provider.score || "—"}/100</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {result.notes?.length > 0 && (
            <div className="fcc-notes">
              <h3>Lookup Notes</h3>
              {result.notes.map((note, index) => <p key={index}>{note}</p>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
