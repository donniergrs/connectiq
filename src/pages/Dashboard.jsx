import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

export default function Dashboard() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeads(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return unsubscribe;
  }, []);

  const todaysLeads = useMemo(() => {
    const today = new Date().toDateString();

    return leads.filter((lead) => {
      const created = lead.createdAt?.toDate?.();
      return created && created.toDateString() === today;
    });
  }, [leads]);

  const pendingLeads = leads.filter((lead) => {
    return !lead.status || lead.status === "New Lead" || lead.status === "New";
  });

  const recentLeads = leads.slice(0, 8);

  return (
    <section>
      <div className="admin-heading">
        <span>Advisor Portal</span>
        <h1>Dashboard</h1>
        <p>Live customer requests from the ConnectIQ website.</p>
      </div>

      <div className="admin-metrics">
        <div className="admin-card">
          <h3>Total Leads</h3>
          <strong>{leads.length}</strong>
        </div>

        <div className="admin-card">
          <h3>Today's Leads</h3>
          <strong>{todaysLeads.length}</strong>
        </div>

        <div className="admin-card">
          <h3>Pending Follow Up</h3>
          <strong>{pendingLeads.length}</strong>
        </div>

        <div className="admin-card">
          <h3>Closed Sales</h3>
          <strong>0</strong>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <div>
            <h2>Recent Leads</h2>
            <p>New submissions appear here automatically.</p>
          </div>
        </div>

        {recentLeads.length === 0 ? (
          <div className="empty-state">
            No leads yet. Submit a test request from the public availability page.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Recommended</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {recentLeads.map((lead) => (
                <tr key={lead.id} className="clickable-row">
                  <td><Link to={`/admin/leads/${lead.id}`}>{lead.name || "Unknown"}</Link></td>
                  <td>{lead.phone || "—"}</td>
                  <td>{lead.email || "—"}</td>
                  <td>{lead.recommendedProvider || "—"}</td>
                  <td>{lead.priority || "—"}</td>
                  <td>
                    <span className="status-pill">
                      {lead.status || "New Lead"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
