import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { BarChart3, CircleDollarSign, Gauge, RefreshCw, Save, Sparkles, Target, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import { db } from "../firebase";
import { buildExecutiveIntelligence } from "../services/aiSalesIntelligence";
import { buildAdvisorRevenueLeaderboard, buildCarrierRevenue, buildExecutiveBriefing, buildFinancialMetrics, buildMonthlyRevenueTrend } from "../services/financialMetricsService";

function currency(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0); }
function Metric({ icon: Icon, label, value, detail, accent = "blue" }) { return <article className={`ai503-metric ai531-metric-${accent}`}><Icon size={19}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>; }

export default function ExecutiveCommandCenter() {
  const [leads, setLeads] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalMRR, setGoalMRR] = useState(50000);
  const [goalDraft, setGoalDraft] = useState("50000");
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    const offLeads = onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (snap) => { setLeads(snap.docs.map((item) => ({ id: item.id, ...item.data() }))); setLoading(false); });
    const offAdvisors = onSnapshot(collection(db, "advisors"), (snap) => setAdvisors(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const offSettings = onSnapshot(doc(db, "settings", "executive"), (snap) => {
      const value = Number(snap.data()?.monthlyMRRGoal || 50000);
      setGoalMRR(value); setGoalDraft(String(value));
    });
    return () => { offLeads(); offAdvisors(); offSettings(); };
  }, []);

  const intelligence = useMemo(() => buildExecutiveIntelligence(leads, advisors), [leads, advisors]);
  const financials = useMemo(() => buildFinancialMetrics(leads, { goalMRR }), [leads, goalMRR]);
  const advisorRevenue = useMemo(() => buildAdvisorRevenueLeaderboard(leads), [leads]);
  const carrierRevenue = useMemo(() => buildCarrierRevenue(leads), [leads]);
  const trend = useMemo(() => buildMonthlyRevenueTrend(leads), [leads]);
  const briefing = useMemo(() => buildExecutiveBriefing(financials, advisorRevenue, carrierRevenue, intelligence), [financials, advisorRevenue, carrierRevenue, intelligence]);
  const maxTrend = Math.max(1, ...trend.map((item) => item.closedMRR));

  async function saveGoal() {
    const nextGoal = Math.max(0, Number(goalDraft) || 0);
    setSavingGoal(true);
    await setDoc(doc(db, "settings", "executive"), { monthlyMRRGoal: nextGoal, updatedAt: new Date() }, { merge: true });
    setSavingGoal(false);
  }

  return <section className="ai503-page"><header className="ai503-hero"><div><span><Sparkles size={15}/> Executive Financial Intelligence</span><h1>Run the recurring-revenue business from one command center.</h1><p>Live Firestore financial metrics, transparent forecasting, revenue performance, and actionable executive intelligence.</p></div><div className="ai531-goal-editor"><label>Monthly MRR goal<input type="number" min="0" step="100" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)}/></label><button type="button" onClick={saveGoal} disabled={savingGoal}><Save size={15}/>{savingGoal ? "Saving…" : "Save goal"}</button></div></header>

    <div className="ai531-scoreboard"><Metric icon={CircleDollarSign} label="Pipeline MRR" value={currency(financials.pipelineMRR)} detail={`${financials.activeCount} active opportunities`}/><Metric icon={BarChart3} label="Forecast MRR" value={currency(financials.forecastMRR)} detail={`${financials.forecastAchievement}% of goal forecast`}/><Metric icon={WalletCards} label="Closed MRR" value={currency(financials.closedMRR)} detail={`${financials.wonCount} won this month`} accent="green"/><Metric icon={TrendingUp} label="ARR" value={currency(financials.arr)} detail="Closed MRR × 12" accent="violet"/><Metric icon={Target} label="Goal attainment" value={`${financials.goalAchievement}%`} detail={`${currency(financials.remainingToGoal)} remaining`} accent={financials.goalStatus === "Ahead of Plan" ? "green" : "amber"}/><Metric icon={CircleDollarSign} label="Forecast commission" value={currency(financials.forecastCommission)} detail={`${currency(financials.closedCommission)} closed commission`} accent="amber"/></div>

    {loading ? <div className="pipeline503-state"><RefreshCw className="is-spinning"/> Loading executive intelligence…</div> : <>
      <section className="ai531-waterfall ai503-panel"><header><div><TrendingUp size={19}/><span>Revenue Waterfall</span></div><small>{financials.goalStatus}</small></header><div>{[{ label: "Pipeline", value: financials.pipelineMRR }, { label: "Forecast", value: financials.forecastMRR }, { label: "Closed MRR", value: financials.closedMRR }, { label: "ARR", value: financials.arr }, { label: "Forecast Commission", value: financials.forecastCommission }].map((item, index) => <article key={item.label}><span>{item.label}</span><strong>{currency(item.value)}</strong>{index < 4 && <i>→</i>}</article>)}</div></section>

      <div className="ai503-grid"><section className="ai503-panel"><header><div><Sparkles size={19}/><span>Executive AI Briefing</span></div><small>Generated from current operational data</small></header><ol className="ai531-briefing">{briefing.map((item) => <li key={item}>{item}</li>)}</ol><div className="ai503-recommendations">{intelligence.recommendations.map((item) => <article key={item.title} className={`ai503-rec ai503-rec-${item.severity}`}><strong>{item.title}</strong><p>{item.action}</p></article>)}</div></section>
        <aside className="ai503-panel"><header><div><Target size={19}/><span>Monthly Goal Tracker</span></div></header><div className="ai531-goal-track"><strong>{currency(financials.closedMRR)}</strong><span>closed of {currency(financials.goalMRR)}</span><i><b style={{ width: `${Math.min(100, financials.goalAchievement)}%` }}/></i><p className={financials.goalStatus === "Ahead of Plan" ? "is-ahead" : "is-behind"}>{financials.goalStatus}</p><small>Forecast: {currency(financials.forecastMRR)}</small></div></aside></div>

      <div className="ai531-financial-grid"><section className="ai503-panel"><header><div><UsersRound size={19}/><span>Advisor Revenue Leaderboard</span></div></header><div className="ai531-table"><div className="ai531-table-head"><span>Advisor</span><span>Closed</span><span>Forecast</span><span>Win</span><span>Avg MRR</span></div>{advisorRevenue.slice(0, 10).map((row) => <div key={row.id}><strong>{row.name}</strong><span>{currency(row.closedMRR)}</span><span>{currency(row.forecastMRR)}</span><span>{row.winRate}%</span><span>{currency(row.averageMRR)}</span></div>)}</div></section>
        <section className="ai503-panel"><header><div><Gauge size={19}/><span>Carrier Revenue Performance</span></div></header><div className="ai531-table ai531-carrier-table"><div className="ai531-table-head"><span>Carrier</span><span>Pipeline</span><span>Forecast</span><span>Closed</span><span>Commission</span></div>{carrierRevenue.slice(0, 10).map((row) => <div key={row.carrier}><strong>{row.carrier}</strong><span>{currency(row.pipelineMRR)}</span><span>{currency(row.forecastMRR)}</span><span>{currency(row.closedMRR)}</span><span>{currency(row.commission)}</span></div>)}</div></section></div>

      <section className="ai503-panel"><header><div><BarChart3 size={19}/><span>Closed MRR — Last Six Months</span></div><small>Based on recorded closed dates</small></header><div className="ai531-trend">{trend.map((item) => <div key={item.key}><span>{currency(item.closedMRR)}</span><i><b style={{ height: `${Math.max(4, (item.closedMRR / maxTrend) * 100)}%` }}/></i><strong>{item.label}</strong></div>)}</div></section>

      <div className="ai503-risk-row"><div><strong>{intelligence.overdue}</strong><span>Overdue follow-ups</span></div><div><strong>{intelligence.stale}</strong><span>Stale active leads</span></div><div><strong>{intelligence.closed}</strong><span>Closed records</span></div></div>
    </>}
  </section>;
}
