import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import { listOrders, ORDER_STATUSES, updateOrderStatus } from "../services/orderService";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try { setOrders(await listOrders()); } catch (err) { setError(err.message || "Orders could not be loaded."); }
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    listOrders()
      .then((items) => { if (active) setOrders(items); })
      .catch((err) => { if (active) setError(err.message || "Orders could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const metrics = useMemo(() => ({
    active: orders.filter((item) => !["Installed", "Cancelled"].includes(item.status)).length,
    installed: orders.filter((item) => item.status === "Installed").length,
    mrr: orders.filter((item) => item.status === "Installed").reduce((sum, item) => sum + item.monthlyRecurringRevenue, 0),
    commission: orders.reduce((sum, item) => sum + item.expectedCommission, 0),
  }), [orders]);

  async function changeStatus(order, status) {
    await updateOrderStatus(order.id, status, order.externalOrderId);
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
  }

  return <main className="orders-page">
    <header className="provider-audit-hero"><div><span className="eyebrow">Revenue Operations</span><h1>Order Workspace</h1><p>Prepare, track, and reconcile DSI and carrier orders. API submission remains disabled until credentials and an approved DSI interface are configured.</p></div><span className="provider-audit-badge"><PackageCheck size={18}/> Manual workflow</span></header>
    <section className="provider-audit-kpis"><article><span>Active orders</span><strong>{metrics.active}</strong></article><article><span>Installed</span><strong>{metrics.installed}</strong></article><article><span>Closed MRR</span><strong>${metrics.mrr.toLocaleString()}</strong></article><article><span>Expected commission</span><strong>${metrics.commission.toLocaleString()}</strong></article></section>
    {error && <div className="intake-alert error">{error}</div>}
    <section className="provider-audit-card"><div className="intake-panel-heading"><div><span className="eyebrow">Order queue</span><h2>Customer orders</h2></div><button className="secondary-button" onClick={refresh}>Refresh</button></div>
      {loading ? <p><Loader2 className="spin"/> Loading orders...</p> : orders.length === 0 ? <p className="muted-copy">No orders yet. Create an order from a qualified lead when the customer is ready.</p> : <div className="preview-table-wrap"><table className="preview-table"><thead><tr><th>Customer</th><th>Provider</th><th>Product</th><th>MRR</th><th>Commission</th><th>Status</th></tr></thead><tbody>{orders.map((order)=><tr key={order.id}><td><strong>{order.customerName}</strong><small>{order.serviceAddress}</small></td><td>{order.provider || "Unverified"}</td><td>{order.product || "Not selected"}</td><td>${order.monthlyRecurringRevenue}</td><td>${order.expectedCommission}</td><td><select value={order.status} onChange={(e)=>changeStatus(order,e.target.value)}>{ORDER_STATUSES.map((status)=><option key={status}>{status}</option>)}</select>{order.status === "Installed" && <CheckCircle2 size={16}/>}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
