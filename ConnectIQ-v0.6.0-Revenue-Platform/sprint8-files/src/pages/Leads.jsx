import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

const STATUSES = ["All", "New Lead", "Contacted", "Appointment Scheduled", "Proposal Sent", "Sold", "Installed", "Lost"];
const SOURCES = ["All", "public_availability_page", "contact_page", "business_page", "website"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");

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
      const matchesSource = source === "All" || (lead.source || "website") === source;
      const haystack = `${lead.name || ""} ${lead.email || ""} ${lead.phone || ""} ${lead.address || ""} ${lead.recommendedProvider || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [leads, search, status, source]);

  return (
    <section>
      <div className="admin-heading">
        <span>CRM Workspace</span>
        <h1>Leads</h1>
        <p>Search, filter, and manage every customer request.</p>
      </div>

      <div className="crm-toolbar crm-toolbar-v2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, address, provider..." />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((item) => <option key={item} value={item}>{formatSource(item)}</option>)}</select>
      </div>

      <div className="admin-table-card glass-panel">
        <div className="table-header"><div><h2>{filteredLeads.length} Leads</h2><p>Click a customer name to open the advisor workspace.</p></div></div>

        {filteredLeads.length === 0 ? <div className="empty-state">No leads match your filters.</div> : (
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Source</th><th>Recommended</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td><Link to={`/admin/leads/${lead.id}`}>{lead.name || "Unknown"}</Link></td>
                  <td>{lead.phone || "—"}</td>
                  <td>{lead.email || "—"}</td>
                  <td>{formatSource(lead.source)}</td>
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

function formatSource(source = "") {
  if (source === "All") return "All Sources";
  return source.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Website";
}
