import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { lookupFccProviders, runFccDiagnostic } from "../services/fccAdminService";

export default function FccLookup() {
  const [address, setAddress] = useState("101 plum creek ln greenville sc 29607");
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

  const providers = result?.providers || [];
  const recommended = result?.recommendedProvider || providers[0] || null;
  const competition = result?.competition || {};

  const providerBreakdown = useMemo(() => {
    return {
      fiber: providers.filter((p) => p.technology === "Fiber").length,
      cable: providers.filter((p) => p.technology === "Cable").length,
      fixedWireless: providers.filter((p) => p.technology === "Fixed Wireless").length,
      satellite: providers.filter((p) => p.technology === "Satellite").length,
    };
  }, [providers]);

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
      setError(err.message || "FCC lookup failed");
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
        fccLocationId: result.locationId || result.location_id || "",
        fccFabricId: result.fabricId || "",
        fccFabricVintage: result.fabricVintage || "",
        providers: result.providers || [],
        recommendedProvider: result.recommendedProvider?.name || result.providers?.[0]?.name || "",
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
        <h1>FCC Live Provider Lookup</h1>
        <p>Search an address through the FCC fabric API and return live providers, speeds, technology, and advisor ranking.</p>
      </div>

      <div className="fcc-grid">
        <div className="admin-table-card">
          <h2>FCC Status</h2>
          <p className="muted-copy">Confirm backend FCC authentication and as-of-date access.</p>
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
          <h2>Run Live Address Lookup</h2>
          <form className="fcc-form" onSubmit={handleLookup}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="101 Plum Creek Ln Greenville SC 29607" required />
            <button className="admin-save-button" type="submit" disabled={loading}>{loading ? "Searching FCC..." : "Lookup Live Providers"}</button>
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
              <h2>Live FCC Provider Results</h2>
              <p>{result.message}</p>
            </div>
            <span className="status-pill">Source: {result.source}</span>
          </div>

          <div className="fcc-summary-strip">
            <div><strong>Total Providers</strong><span>{providers.length}</span></div>
            <div><strong>Fiber</strong><span>{providerBreakdown.fiber}</span></div>
            <div><strong>Cable</strong><span>{providerBreakdown.cable}</span></div>
            <div><strong>Fixed Wireless</strong><span>{providerBreakdown.fixedWireless}</span></div>
            <div><strong>Satellite</strong><span>{providerBreakdown.satellite}</span></div>
          </div>

          {result.location && (
            <div className="fcc-geocode">
              <strong>Matched Address:</strong> {result.location.address_primary || result.location.addr_full || result.location.matchedAddress || "—"}
              <span>Location ID: {result.locationId || "—"}</span>
              <span>Fabric: {result.fabricVintage || "—"}</span>
            </div>
          )}

          {recommended && (
            <div className="recommendation-card compact-recommendation">
              <div className="recommended-badge">ConnectIQ Recommended</div>
              <h3>{recommended.name}</h3>
              <div className="score-badge">{recommended.score || "—"}/100 Advisor Score</div>
              <p>{recommended.technology} • {recommended.download} Mbps down / {recommended.upload} Mbps up</p>
              <ul>
                {(recommended.reasons || []).map((reason) => <li key={reason}>✓ {reason}</li>)}
              </ul>
            </div>
          )}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Provider</th>
                <th>Company</th>
                <th>Technology</th>
                <th>Download</th>
                <th>Upload</th>
                <th>Service</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider, index) => (
                <tr key={provider.id || `${provider.name}-${index}`}>
                  <td>{index === 0 ? "⭐ #1" : `#${index + 1}`}</td>
                  <td>{provider.name}</td>
                  <td>{provider.company || provider.holdingCompany || "—"}</td>
                  <td>{provider.technology}</td>
                  <td>{provider.download} Mbps</td>
                  <td>{provider.upload} Mbps</td>
                  <td>{provider.serviceType || "—"}</td>
                  <td><span className="mini-score">{provider.score || "—"}/100</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {competition?.competitionLevel && (
            <div className="fcc-notes">
              <h3>Competition Summary</h3>
              <p>{competition.competitionLevel}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
