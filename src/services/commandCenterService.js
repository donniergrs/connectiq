const asDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const text = (...values) => values.find((value) => String(value ?? "").trim()) || "";

function normalizedStatus(lead = {}) {
  return text(lead.status, lead.pipelineStage, lead.readinessStatus, "New Lead");
}

export function smartNextAction(lead = {}) {
  const status = normalizedStatus(lead).toLowerCase();
  const order = lead.orderIQ || {};
  const quoteExists = Boolean(lead.quoteId || lead.quote || lead.salesSummary?.quote || lead.quoteStatus);
  const orderReady = Number(order.readinessScore || lead.orderReadinessScore || 0) >= 100 || /order ready|ready to submit/.test(status);
  const submitted = /submitted|installed|activated/.test(status) || Boolean(order.externalOrderId);
  const contactComplete = Boolean(text(lead.phone, lead.customer?.phone) || text(lead.email, lead.customer?.email));
  const recommendationExists = Boolean(text(lead.recommendedProvider, lead.recommendation?.provider, lead.salesSummary?.recommendation?.provider));

  if (submitted) return { label: "Track installation", type: "track", reason: "The order has been submitted." };
  if (orderReady) return { label: "Submit to DSI", type: "submit", reason: "OrderIQ reports that the order is ready." };
  if (quoteExists) return { label: "Prepare OrderIQ", type: "order", reason: "A quote exists and the next step is order preparation." };
  if (recommendationExists) return { label: "Send Quote", type: "quote", reason: "A recommendation is available for customer review." };
  if (contactComplete) return { label: "Complete recommendation", type: "recommend", reason: "Customer contact information is available." };
  return { label: "Complete customer profile", type: "profile", reason: "Core contact details are still missing." };
}

export function buildCommandCenter(leads = []) {
  const now = new Date();
  const todayKey = now.toDateString();
  const records = leads.map((lead) => {
    const createdAt = asDate(lead.createdAt || lead.createdDate);
    const status = normalizedStatus(lead);
    const quoteExists = Boolean(lead.quoteId || lead.quote || lead.salesSummary?.quote || /quote/i.test(status));
    const orderScore = Number(lead.orderIQ?.readinessScore || lead.orderReadinessScore || 0);
    const orderReady = orderScore >= 100 || /order ready|ready to submit/i.test(status);
    const submitted = /submitted|installed|activated/i.test(status) || Boolean(lead.orderIQ?.externalOrderId);
    const expectedCommission = Number(lead.orderIQ?.expectedCommission || lead.expectedCommission || lead.recommendation?.expectedCommission || 0);
    const readiness = Number(lead.readinessScore || lead.readiness || lead.profileCompleteness || 0);
    return {
      ...lead,
      createdAtDate: createdAt,
      status,
      quoteExists,
      orderReady,
      submitted,
      expectedCommission,
      readiness,
      nextAction: smartNextAction(lead),
      customerName: text(lead.customerName, lead.name, lead.customer?.name, "Unknown Customer"),
      address: text(lead.serviceAddress, lead.address, lead.customer?.address, "Address not captured"),
      provider: text(lead.orderIQ?.provider, lead.recommendedProvider, lead.recommendation?.provider, lead.salesSummary?.recommendation?.provider, "Not selected"),
    };
  });

  const active = records.filter((lead) => !/lost|closed|installed|activated/i.test(lead.status));
  const metrics = {
    total: records.length,
    today: records.filter((lead) => lead.createdAtDate?.toDateString() === todayKey).length,
    quotesSent: records.filter((lead) => lead.quoteExists).length,
    ordersReady: records.filter((lead) => lead.orderReady).length,
    ordersSubmitted: records.filter((lead) => lead.submitted).length,
    commissionPipeline: active.reduce((sum, lead) => sum + lead.expectedCommission, 0),
    conversionRate: records.length ? Math.round((records.filter((lead) => lead.submitted).length / records.length) * 100) : 0,
  };

  const queue = [...active]
    .sort((a, b) => {
      const actionPriority = { submit: 6, order: 5, quote: 4, recommend: 3, profile: 2, track: 1 };
      return (actionPriority[b.nextAction.type] || 0) - (actionPriority[a.nextAction.type] || 0)
        || b.readiness - a.readiness
        || (b.createdAtDate?.getTime() || 0) - (a.createdAtDate?.getTime() || 0);
    })
    .slice(0, 12);

  const recentActivity = records
    .flatMap((lead) => (Array.isArray(lead.opportunityJournal) ? lead.opportunityJournal : []).map((event) => ({ ...event, leadId: lead.id, customerName: lead.customerName, date: asDate(event.createdAt) })))
    .filter((event) => event.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 12);

  return { metrics, queue, recentActivity };
}
