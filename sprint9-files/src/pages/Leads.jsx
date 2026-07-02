import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { STATUS_FLOW } from "../services/providerIntelligence";

const FILTERS = ["All", ...STATUS_FLOW];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const currentStatus = lead.status || "New Lead";
      const statusMatch = status === "All" || currentStatus === status;
      const haystack = [lead.name, lead.email, lead.phone, lead.address, lead.recommendedProvider, lead.priority]
        .join(" ")
        .toLowerCase();
      return statusMatch && haystack.includes(search.toLowerCase());
    });
  }, [leads, search, status]);

  return (
    <section className="sprint9-page">
      <div className="sprint9-hero-card compact">
        <div>
          <span className="eyebrow">CRM Workspace</span>
          <h1>Lead Pipeline</h1>
          <p>Search, filter, and work every ConnectIQ customer request.</p>
        </div>
      </div>

      <div className="sprint9-toolbar">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, phone, provider, address..." />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILTERS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="sprint9-panel">
        <div className="sprint9-panel-header">
          <div>
            <span className="eyebrow">{filtered.length} Records</span>
            <h2>Customer Leads</h2>
          </div>
        </div>

        {filtered.length === 0 ? <div className="empty-state">No matching leads.</div> : (
          <div className="sprint9-table-wrap">
            <table className="sprint9-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Recommendation</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td><Link to={`/admin/leads/${lead.id}`}>{lead.name || "Unknown"}</Link></td>
                    <td><div>{lead.phone || "—"}</div><small>{lead.email || "—"}</small></td>
                    <td>{lead.address || "—"}</td>
                    <td>{lead.recommendedProvider || "—"}</td>
                    <td>{lead.priority || "—"}</td>
                    <td><span className="sprint9-status">{lead.status || "New Lead"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
