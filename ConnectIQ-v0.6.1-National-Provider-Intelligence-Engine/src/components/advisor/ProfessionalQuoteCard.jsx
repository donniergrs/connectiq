import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Router,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  buildQuoteTradeoffs,
  findNextBestProvider,
  quoteMatchLabel,
} from "../../services/brain/quote/quotePresentation";

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function ProfessionalQuoteCard({ quote, recommendation, providers = [], needs = {}, confidence = 0, onContinue }) {
  if (!quote) return null;
  const nextBest = findNextBestProvider(providers, recommendation);
  const { strengths, tradeoffs } = buildQuoteTradeoffs({ quote, recommendation, nextBest, needs });
  const score = Number(recommendation?.advisorScore || quote.advisorScore || 0);
  const matchLabel = recommendation?.recommendationTier || quoteMatchLabel(score);

  return (
    <div className="v040-pro-quote">
      <div className="v040-pro-quote-hero">
        <div>
          <span className="v040-pro-quote-eyebrow"><Sparkles size={15} /> Your personalized internet plan</span>
          <h2>{quote.provider}</h2>
          <p>{quote.recommendedPlan?.name || quote.productName}</p>
        </div>
        <div className="v040-pro-quote-confidence" aria-label={`${score} percent match, ${matchLabel}`}>
          <strong>{score}%</strong>
          <span>{matchLabel}</span>
          <small>{confidence}% recommendation confidence</small>
        </div>
      </div>

      <div className="v040-pro-quote-price-row">
        <div className="v040-pro-quote-price">
          <span><CircleDollarSign size={18} /> Estimated monthly cost</span>
          <strong>{currency(quote.monthlyPrice)}<small>/month</small></strong>
          <p>{quote.pricing?.sourceLabel || "Planning estimate"}. Final pricing is confirmed during ordering.</p>
        </div>
        <div className="v040-pro-quote-plan">
          <span><Gauge size={18} /> Recommended plan</span>
          <strong>{quote.recommendedPlan?.name || quote.productName}</strong>
          <div><b>{quote.download} Mbps</b> download</div>
          <div><b>{quote.upload} Mbps</b> upload</div>
        </div>
      </div>

      <div className="v040-pro-quote-facts">
        <div><Router /><span>Technology<b>{quote.technology}</b></span></div>
        <div><CalendarClock /><span>Installation<b>{quote.installation?.method || "Provider confirmation required"}</b><small>{quote.installation?.estimatedWindow}</small></span></div>
        <div><ShieldCheck /><span>Quote status<b>{quote.status || "Estimate"}</b><small>Version {quote.quoteVersion}</small></span></div>
      </div>

      <section className="v040-pro-quote-why">
        <h3>Why this plan fits you</h3>
        <div>{strengths.map((reason) => <span key={reason}><CheckCircle2 size={17} />{reason}</span>)}</div>
      </section>

      {nextBest && (
        <section className="v040-pro-quote-compare">
          <span>Compared with the next-best option</span>
          <div>
            <section><small>Recommended</small><strong>{quote.provider}</strong><b>{score}% match</b><p>{quote.recommendedPlan?.name || quote.productName}</p></section>
            <i>vs.</i>
            <section><small>Alternative</small><strong>{nextBest.displayName || nextBest.name}</strong><b>{Number(nextBest.advisorScore || 0)}% match</b><p>{nextBest.technology || nextBest.technologyType || "Broadband"}</p></section>
          </div>
        </section>
      )}

      <details className="v040-pro-quote-details-panel">
        <summary>Why this quote? <ChevronDown size={18} /></summary>
        <div>
          <section>
            <h4>How it was selected</h4>
            <p>This estimate combines your household profile, stated priorities, available provider technology, and the Quote Engine’s right-sized planning tier.</p>
          </section>
          <section>
            <h4>Important tradeoffs</h4>
            {tradeoffs.map((item) => <p key={item}>• {item}</p>)}
          </section>
          <section>
            <h4>Planning assumptions</h4>
            {(quote.assumptions || []).map((item) => <p key={item}>• {item}</p>)}
          </section>
        </div>
      </details>

      <div className="v040-pro-quote-trust">
        <BadgeCheck size={19} />
        <p><b>Transparent estimate.</b> Taxes, fees, equipment, promotions, contracts, and installation timing require provider confirmation. ConnectIQ does not collect payment here.</p>
      </div>

      <button className="v040-primary v040-pro-quote-cta" type="button" onClick={onContinue}>
        Continue to order <ArrowRight size={18} />
      </button>
    </div>
  );
}
