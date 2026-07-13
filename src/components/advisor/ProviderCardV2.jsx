import { Check, CircleAlert, Gauge, Wifi } from "lucide-react";
import { buildProviderInsights } from "../../services/brain/explainability";

export default function ProviderCardV2({ provider, needs, rank, selected, onSelect }) {
  const insight = buildProviderInsights(provider, needs);
  const badge = rank === 0 ? "Best Match" : rank === 1 ? "Strong Alternative" : Number(provider.download || 0) >= 1000 ? "High Speed" : "Available";
  return (
    <article className={`v040-provider-card ${selected ? "is-selected" : ""}`}>
      <div className="v040-provider-card-top"><div><span className="v040-provider-badge">{badge}</span><h3>{provider.displayName}</h3><p><Wifi size={15} /> {provider.technology}</p></div><strong>{provider.advisorScore}<small>/100</small></strong></div>
      <div className="v040-provider-speed"><Gauge size={18} /><b>{provider.download || "—"} Mbps</b><span>download</span><b>{provider.upload || "—"} Mbps</b><span>upload</span></div>
      <p className="v040-best-for"><b>Best for:</b> {insight.bestFor}</p>
      <div className="v040-procon"><div>{insight.pros.map((item) => <span key={item}><Check size={14} />{item}</span>)}</div><div>{insight.cons.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}</div></div>
      <button type="button" onClick={() => onSelect(provider)}>{selected ? "Selected" : `Choose ${provider.displayName}`}</button>
    </article>
  );
}
