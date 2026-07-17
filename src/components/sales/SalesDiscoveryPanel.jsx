import { useMemo, useState } from "react";
import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CheckCircle2, Compass, Save } from "lucide-react";
import { db } from "../../firebase";
import { buildDiscoveryPlan, normalizeDiscovery } from "../../services/salesBrain/discoveryEngine";

const usageOptions = ["Streaming", "Gaming", "Working from home", "Online school", "Everyday browsing", "Smart home"];

export default function SalesDiscoveryPanel({ lead }) {
  const initial = useMemo(() => normalizeDiscovery(lead || {}), [lead]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const plan = useMemo(() => buildDiscoveryPlan({ ...(lead || {}), aiSales: { ...(lead?.aiSales || {}), discovery: form } }), [lead, form]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleUsage = (value) => set("householdUsage", form.householdUsage.includes(value) ? form.householdUsage.filter((item) => item !== value) : [...form.householdUsage, value]);

  async function saveDiscovery() {
    if (!lead?.id) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "leads", lead.id), {
        currentProvider: form.currentProvider,
        currentMonthlyBill: Number(form.monthlyBill || 0),
        customerSatisfaction: Number(form.satisfaction || 0),
        primaryPainPoint: form.primaryPainPoint,
        buyingTimeline: form.switchTimeline,
        preferredContact: form.preferredContact,
        bestContactTime: form.bestContactTime,
        aiSales: {
          ...(lead.aiSales || {}),
          permissionToContinue: form.permissionToContinue,
          stage: plan.complete ? "recommendation" : "discovery",
          discovery: form,
          discoveryVersion: plan.version,
          discoveryCompletion: plan.completionPercent,
          qualificationScore: plan.scoring.score,
          closeProbability: plan.scoring.closeProbability,
          priority: plan.scoring.priority,
          scoreReasons: plan.scoring.reasons,
          riskFactors: plan.scoring.risks,
          nextQuestion: plan.next.question,
          nextAction: plan.nextAction,
          conversationSummary: plan.summary,
          updatedAt: now,
        },
        aiSalesSummary: plan.summary,
        aiSalesStage: plan.complete ? "recommendation" : "discovery",
        aiSalesPriority: plan.scoring.priority,
        aiSalesScore: plan.scoring.score,
        nextAction: plan.nextAction,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        opportunityJournal: arrayUnion({
          type: "ai_discovery_updated",
          title: "AI sales discovery updated",
          detail: `${plan.completionPercent}% complete · ${plan.scoring.priority} priority · ${plan.scoring.closeProbability}% estimated close probability`,
          createdAt: now,
          source: "ConnectIQ AI-002 Discovery Engine",
        }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } finally { setSaving(false); }
  }

  return <section className="discovery002-panel">
    <header><div className="discovery002-icon"><Compass size={19}/></div><div><span>ConnectIQ AI-002</span><h2>Sales Discovery Engine</h2></div></header>
    <div className="discovery002-metrics"><article><strong>{plan.completionPercent}%</strong><span>discovery complete</span></article><article><strong>{plan.scoring.score}</strong><span>lead score</span></article><article><strong>{plan.scoring.closeProbability}%</strong><span>close probability</span></article><article><strong>{plan.scoring.priority}</strong><span>priority</span></article></div>
    <div className="discovery002-next"><span>Ask next</span><strong>{plan.next.question}</strong></div>
    <div className="discovery002-form">
      <label className="discovery002-check"><input type="checkbox" checked={form.permissionToContinue} onChange={(e)=>set("permissionToContinue", e.target.checked)}/> Customer gave permission to continue</label>
      <label>Current provider<input value={form.currentProvider} onChange={(e)=>set("currentProvider", e.target.value)} placeholder="Spectrum, AT&T, etc."/></label>
      <label>Monthly internet bill<input type="number" min="0" value={form.monthlyBill || ""} onChange={(e)=>set("monthlyBill", e.target.value)} placeholder="105"/></label>
      <label>Satisfaction<select value={form.satisfaction || ""} onChange={(e)=>set("satisfaction", Number(e.target.value))}><option value="">Select 1–5</option><option value="1">1 — Very unhappy</option><option value="2">2 — Unhappy</option><option value="3">3 — Neutral</option><option value="4">4 — Happy</option><option value="5">5 — Very happy</option></select></label>
      <label>Main concern<input value={form.primaryPainPoint} onChange={(e)=>set("primaryPainPoint", e.target.value)} placeholder="High bill, outages, slow Wi-Fi…"/></label>
      <label>Switching timeline<input value={form.switchTimeline} onChange={(e)=>set("switchTimeline", e.target.value)} placeholder="This week, within 30 days…"/></label>
      <label>People in home<input type="number" min="0" value={form.people || ""} onChange={(e)=>set("people", e.target.value)}/></label>
      <label>Connected devices<input type="number" min="0" value={form.devices || ""} onChange={(e)=>set("devices", e.target.value)}/></label>
      <label>Preferred contact<select value={form.preferredContact} onChange={(e)=>set("preferredContact", e.target.value)}><option value="">Select</option><option>Phone</option><option>Text</option><option>Email</option></select></label>
      <label>Best contact time<input value={form.bestContactTime} onChange={(e)=>set("bestContactTime", e.target.value)} placeholder="Friday after 5 PM"/></label>
      <label className="discovery002-wide">Contract status<input value={form.contractStatus} onChange={(e)=>set("contractStatus", e.target.value)} placeholder="No contract, under contract, unsure…"/></label>
    </div>
    <div className="discovery002-usage"><span>Household internet use</span><div>{usageOptions.map((item)=><button key={item} type="button" className={form.householdUsage.includes(item)?"is-selected":""} onClick={()=>toggleUsage(item)}>{item}</button>)}</div></div>
    <div className="discovery002-explain"><div><span>Why this score</span>{plan.scoring.reasons.length ? plan.scoring.reasons.map((r)=><p key={r}><CheckCircle2 size={13}/>{r}</p>) : <p>Complete discovery to generate explainable scoring.</p>}</div>{plan.scoring.risks.length>0 && <div><span>Risks</span>{plan.scoring.risks.map((r)=><p key={r}>{r}</p>)}</div>}</div>
    <button type="button" className="discovery002-save" onClick={saveDiscovery} disabled={saving}><Save size={16}/>{saving?"Saving…":"Save discovery to customer card"}</button>
    {saved && <p className="discovery002-saved"><CheckCircle2 size={15}/> Discovery and next action saved.</p>}
  </section>;
}
