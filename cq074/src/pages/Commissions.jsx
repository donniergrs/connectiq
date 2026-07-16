import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { buildCommissionMetrics, normalizeCommission } from "../services/commissionService";

export default function Commissions() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    getDocs(query(collection(db, "commissions"), orderBy("createdAt", "desc")))
      .then((snapshot) => setRecords(snapshot.docs.map((item) => normalizeCommission({ id: item.id, ...item.data() }))))
      .catch((err) => setError(err.message || "Commission records could not be loaded."));
  }, []);
  const metrics = useMemo(() => buildCommissionMetrics(records), [records]);
  return <main className="commissions-page">
    <header className="provider-audit-hero"><div><span className="eyebrow">Financial Operations</span><h1>Commission Intelligence</h1><p>Track forecast, earned, paid, and disputed commissions without mixing them with provider availability.</p></div></header>
    <section className="provider-audit-kpis"><article><span>Forecast</span><strong>${metrics.forecast.toLocaleString()}</strong></article><article><span>Earned</span><strong>${metrics.earned.toLocaleString()}</strong></article><article><span>Paid</span><strong>${metrics.paid.toLocaleString()}</strong></article><article><span>Disputed</span><strong>${metrics.disputed.toLocaleString()}</strong></article></section>
    {error && <div className="intake-alert error">{error}</div>}
    <section className="provider-audit-card"><h2>Commission ledger</h2>{records.length === 0 ? <p className="muted-copy">No commission records yet. Records will appear as orders advance through installation and payout.</p> : <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Customer</th><th>Provider</th><th>Advisor</th><th>MRR</th><th>Commission</th><th>Status</th></tr></thead><tbody>{records.map((item)=><tr key={item.id}><td>{item.customerName}</td><td>{item.provider}</td><td>{item.advisor}</td><td>${item.monthlyRecurringRevenue}</td><td>${item.amount}</td><td>{item.status}</td></tr>)}</tbody></table></div>}</section>
  </main>;
}
