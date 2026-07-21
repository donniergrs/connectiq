import { BrainCircuit, CheckCircle2, CircleHelp, Gauge, ShieldAlert, Target } from "lucide-react";
import { buildAdvisorIntelligence } from "../../services/recommendationIntelligence";

export default function RecommendationIntelligencePanel({ lead }) {
  const intel = buildAdvisorIntelligence(lead);
  const { profile, recommendation } = intel;
  return (
    <section className="lead502-panel ai007-panel">
      <header><div className="lead502-panel-icon"><BrainCircuit size={18} /></div><div><span>AI-007 recommendation intelligence</span><h2>Decision summary</h2></div></header>
      <div className="ai007-confidence">
        <div><Gauge size={18}/><span>Confidence</span><strong>{recommendation.confidence ? `${recommendation.confidence}%` : "Not scored"}</strong><small>{recommendation.confidenceLevel}</small></div>
        <div><Target size={18}/><span>Final score</span><strong>{recommendation.finalScore || "—"}</strong><small>60% business · 40% fit</small></div>
      </div>
      <div className="ai007-profile-grid">
        <div><span>Current provider</span><strong>{profile.currentProvider}</strong></div>
        <div><span>Current bill</span><strong>{profile.monthlyBill ? `$${profile.monthlyBill}/mo` : "Not captured"}</strong></div>
        <div><span>Remote work</span><strong>{profile.workFromHome ? "Yes" : "No"}</strong></div>
        <div><span>Gaming / streaming</span><strong>{[profile.gaming && "Gaming", profile.streaming && "Streaming"].filter(Boolean).join(" · ") || "Not captured"}</strong></div>
        <div><span>Price priority</span><strong>{profile.pricePriority}</strong></div>
        <div><span>Reliability priority</span><strong>{profile.reliabilityPriority}</strong></div>
      </div>
      <div className="ai007-reasons"><strong>Why ConnectIQ chose {recommendation.provider}</strong>{recommendation.reasons.length ? recommendation.reasons.map((reason) => <p key={reason}><CheckCircle2 size={14}/>{reason}</p>) : <p><CircleHelp size={14}/>Reasoning will appear after the recommendation engine saves an AI-007 result.</p>}</div>
      {profile.painPoints.length > 0 && <div className="ai007-tags"><span>Pain points</span>{profile.painPoints.map((item) => <em key={item}>{item}</em>)}</div>}
      {profile.rejectedProviders.length > 0 && <div className="ai007-warning"><ShieldAlert size={16}/><span>Excluded by customer: {profile.rejectedProviders.join(", ")}</span></div>}
      {intel.missingInformation.length > 0 && <div className="ai007-followup"><strong>Missing information</strong><p>{intel.missingInformation.join(" · ")}</p>{intel.followUpQuestion && <small>Ask next: {intel.followUpQuestion}</small>}</div>}
    </section>
  );
}
