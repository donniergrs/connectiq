import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

const STATUSES = ["All", "New Lead", "Contacted", "Appointment Scheduled", "Proposal Sent", "Sold", "Installed", "Lost"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe;
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = status === "All" || (lead.status || "New Lead") === status;
      const haystack = `${lead.name || ""} ${lead.email || ""} ${lead.phone || ""} ${lead.address || ""} ${lead.recommendedProvider || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [leads, search, status]);

  return (
    <section>
      <div className="admin-heading">
        <span>CRM</span>
        <h1>Leads</h1>
        <p>Search, filter, and manage every customer request.</p>
      </div>

      <div className="crm-toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email, address, provider..."
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <div>
            <h2>{filteredLeads.length} Leads</h2>
            <p>Click a customer name to open the lead detail record.</p>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="empty-state">No leads match your filters.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Recommended</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td><Link to={`/admin/leads/${lead.id}`}>{lead.name || "Unknown"}</Link></td>
                  <td>{lead.phone || "—"}</td>
                  <td>{lead.email || "—"}</td>
                  <td>{lead.address || "—"}</td>
                  <td>{lead.recommendedProvider || "—"}</td>
                  <td>{lead.priority || "—"}</td>
                  <td><span className="status-pill">{lead.status || "New Lead"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
