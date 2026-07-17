import { useMemo, useState } from "react";
import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CheckCircle2, MessageCircleQuestion, Save, ShieldCheck, Sparkles, Target } from "lucide-react";
import { db } from "../../firebase";
import { buildRecommendationStrategy } from "../../services/salesBrain/recommendationObjectionEngine";

export default function RecommendationObjectionPanel({ lead }) {
  const strategy = useMemo(() => buildRecommendationStrategy(lead || {}), [lead]);
  const [selectedKey, setSelectedKey] = useState(strategy.primaryObjection.key);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const selected = strategy.objections.find((item) => item.key === selectedKey) || strategy.primaryObjection;

  async function saveStrategy() {
    if (!lead?.id) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "leads", lead.id), {
        recommendationStrategy: { ...strategy, selectedObjection: selected, savedAt: now },
        likelyObjection: selected.label,
        objectionResponse: selected.response,
        nextBestAction: selected.nextAction,
        updatedAt: serverTimestamp(),
        activity: arrayUnion({ type: "recommendation_strategy_saved", title: "AI recommendation strategy saved", detail: `${strategy.recommendation.provider} · ${selected.label} · ${strategy.close.nextAction}`, createdAt: now, source: "ConnectIQ AI-003" }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    } finally { setSaving(false); }
  }

  return <section className="ai003-panel">
    <header><div className="ai003-icon"><Sparkles size={19}/></div><div><span>ConnectIQ AI-003</span><h2>Recommendation & Objection Engine</h2></div></header>
    <div className="ai003-stage"><span>Customer stage</span><strong>{strategy.stage}</strong><small>{strategy.summary}</small></div>
    <div className="ai003-recommendation"><span>Plain-language recommendation</span><p>{strategy.recommendation.explanation}</p>{strategy.recommendation.reasons.map((reason)=><small key={reason}><CheckCircle2 size={13}/>{reason}</small>)}</div>
    <div className="ai003-objection"><label>Customer objection<select value={selectedKey} onChange={(e)=>setSelectedKey(e.target.value)}>{strategy.objections.map((item)=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label><div><span>Suggested response</span><p>{selected.response}</p><strong>Ask next: {selected.followUp}</strong><small>Next action: {selected.nextAction}</small></div></div>
    <div className="ai003-close"><Target size={17}/><div><span>Closing prompt</span><p>{strategy.close.prompt}</p><strong>{strategy.close.nextAction}</strong></div></div>
    <div className="ai003-guardrails"><ShieldCheck size={16}/><div><span>Sales guardrails</span>{strategy.guardrails.map((item)=><p key={item}>{item}</p>)}</div></div>
    <button type="button" className="ai003-save" onClick={saveStrategy} disabled={saving}><Save size={16}/>{saving?"Saving…":"Save recommendation strategy"}</button>
    {saved && <p className="ai003-saved"><CheckCircle2 size={15}/> Strategy saved to customer card.</p>}
  </section>;
}
