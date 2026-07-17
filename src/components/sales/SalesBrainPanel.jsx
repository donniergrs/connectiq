import { useMemo, useState } from "react";
import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Brain, CheckCircle2, Save, Target } from "lucide-react";
import { db } from "../../firebase";
import { buildConversationSummary, buildSalesPlan } from "../../services/salesBrain/salesBrain";

export default function SalesBrainPanel({ lead }) {
  const plan = useMemo(() => buildSalesPlan(lead || {}), [lead]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function savePlan() {
    if (!lead?.id) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const summary = buildConversationSummary({ lead });
      await updateDoc(doc(db, "leads", lead.id), {
        aiSales: {
          ...(lead.aiSales || {}),
          brainVersion: plan.version,
          stage: plan.stage,
          qualificationScore: plan.qualificationScore,
          priority: plan.priority,
          nextAction: plan.nextAction,
          nextQuestion: plan.nextQuestion,
          recommendationExplanation: plan.recommendationExplanation,
          likelyObjection: plan.likelyObjection,
          objectionResponse: plan.objectionResponse,
          updatedAt: now,
        },
        aiSalesSummary: summary,
        aiSalesStage: plan.stage,
        aiSalesPriority: plan.priority,
        aiSalesScore: plan.qualificationScore,
        nextAction: plan.nextAction,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        opportunityJournal: arrayUnion({
          type: "ai_sales_plan_generated",
          title: "AI Sales Brain plan generated",
          detail: `${plan.stage} stage · ${plan.priority} priority · ${plan.qualificationScore}% qualified`,
          createdAt: now,
          source: "ConnectIQ Sales Brain v1.0",
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="salesbrain-panel">
      <header>
        <div className="salesbrain-icon"><Brain size={19} /></div>
        <div><span>ConnectIQ Sales Brain v1.0</span><h2>AI sales conversation plan</h2></div>
      </header>
      <div className="salesbrain-metrics">
        <article><strong>{plan.qualificationScore}%</strong><span>qualified</span></article>
        <article><strong>{plan.priority}</strong><span>priority</span></article>
        <article><strong>{plan.stage.replaceAll("_", " ")}</strong><span>conversation stage</span></article>
      </div>
      <div className="salesbrain-block"><span>Opening</span><p>{plan.opening}</p></div>
      <div className="salesbrain-block"><span>Ask next</span><p>{plan.nextQuestion}</p></div>
      <div className="salesbrain-block"><span>Simple recommendation language</span><p>{plan.recommendationExplanation}</p></div>
      <div className="salesbrain-block"><span>Likely objection</span><p>{plan.likelyObjection}</p><small>{plan.objectionResponse}</small></div>
      <div className="salesbrain-next"><Target size={16}/><div><span>Next action</span><strong>{plan.nextAction}</strong></div></div>
      {plan.missing.length > 0 && <div className="salesbrain-missing"><span>Still needed</span>{plan.missing.map((item) => <p key={item}><CheckCircle2 size={13}/> {item}</p>)}</div>}
      <button type="button" className="salesbrain-save" onClick={savePlan} disabled={saving}><Save size={16}/>{saving ? "Saving…" : "Save AI sales plan to customer card"}</button>
      {saved && <p className="salesbrain-saved"><CheckCircle2 size={15}/> Saved to the existing customer card.</p>}
    </section>
  );
}
