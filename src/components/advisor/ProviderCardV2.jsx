import { CheckCircle2 } from "lucide-react";

export default function ProviderCardV2({ provider, selected, onSelect }) {
  const reasons = (provider.recommendationReasons || []).slice(0, 2);
  return (
    <article className={`v040-provider-card v040-simple-provider ${selected ? "is-selected" : ""}`}>
      <div className="v040-provider-card-top">
        <div>
          <span className="v040-provider-badge">Other good option</span>
          <h3>{provider.revenueProduct?.productName || provider.displayName}</h3>
          <p>{provider.recommendationTier || "Good Match"}</p>
        </div>
      </div>
      <div className="v040-alt-reasons">
        {reasons.map((reason) => <span key={reason}><CheckCircle2 size={15} />{reason}</span>)}
      </div>
      <button type="button" onClick={() => onSelect(provider)}>{selected ? "Selected" : "Choose this option"}</button>
    </article>
  );
}
