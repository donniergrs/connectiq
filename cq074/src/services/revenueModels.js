export const ORDER_STATUSES = ["Draft", "Ready to Submit", "Submitted", "Carrier Accepted", "Install Scheduled", "Installed", "Cancelled"];
export const COMMISSION_STATUSES = ["Forecast", "Pending Install", "Earned", "Paid", "Disputed"];

export function normalizeOrder(order = {}) {
  return {
    id: order.id || "",
    leadId: order.leadId || "",
    customerName: order.customerName || "Unknown customer",
    serviceAddress: order.serviceAddress || "",
    provider: order.provider || "",
    product: order.product || "",
    monthlyRecurringRevenue: Number(order.monthlyRecurringRevenue || 0),
    expectedCommission: Number(order.expectedCommission || 0),
    status: ORDER_STATUSES.includes(order.status) ? order.status : "Draft",
    externalOrderId: order.externalOrderId || "",
    notes: order.notes || "",
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
  };
}

export function normalizeCommission(record = {}) {
  return {
    id: record.id || "",
    orderId: record.orderId || "",
    advisor: record.advisor || "Unassigned",
    provider: record.provider || "Unknown",
    customerName: record.customerName || "Unknown customer",
    amount: Number(record.amount || record.expectedCommission || 0),
    monthlyRecurringRevenue: Number(record.monthlyRecurringRevenue || 0),
    status: COMMISSION_STATUSES.includes(record.status) ? record.status : "Forecast",
    paidDate: record.paidDate || "",
  };
}

export function buildCommissionMetrics(records = []) {
  const normalized = records.map(normalizeCommission);
  const sum = (status) => normalized.filter((item) => status.includes(item.status)).reduce((total, item) => total + item.amount, 0);
  return {
    forecast: sum(["Forecast", "Pending Install"]),
    earned: sum(["Earned"]),
    paid: sum(["Paid"]),
    disputed: sum(["Disputed"]),
    total: normalized.reduce((total, item) => total + item.amount, 0),
    records: normalized,
  };
}
