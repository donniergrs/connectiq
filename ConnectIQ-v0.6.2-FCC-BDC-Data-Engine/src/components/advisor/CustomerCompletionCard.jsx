import { BadgeCheck, CheckCircle2, MessageCircle, RotateCcw, Sparkles } from "lucide-react";

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function CustomerCompletionCard({ completion, onRestart, onOpenChat }) {
  if (!completion) return null;

  return (
    <div className="v040-customer-completion">
      <header className="v040-customer-completion-hero">
        <span><Sparkles size={16} /> Recommendation complete</span>
        <h2>Thank you, {completion.customerName}.</h2>
        <p>Your personalized internet recommendation has been saved for ConnectIQ advisor review.</p>
      </header>

      <section className="v040-customer-reference">
        <BadgeCheck size={24} />
        <div>
          <span>Reference number</span>
          <strong>{completion.referenceNumber}</strong>
        </div>
      </section>

      <section className="v040-customer-recommendation">
        <div>
          <span>Recommended provider</span>
          <strong>{completion.provider}</strong>
        </div>
        <div>
          <span>Recommended plan</span>
          <strong>{completion.plan}</strong>
        </div>
        <div>
          <span>Estimated monthly price</span>
          <strong>{currency(completion.monthlyPrice)}</strong>
          <small>{completion.pricingLabel}</small>
        </div>
      </section>

      <section className="v040-customer-next-steps">
        <h3>What happens next</h3>
        <div>
          {completion.nextSteps.map((step) => (
            <p key={step}><CheckCircle2 size={17} />{step}</p>
          ))}
        </div>
      </section>

      <p className="v040-customer-disclaimer">{completion.disclaimer}</p>

      <div className="v040-customer-completion-actions">
        <button type="button" className="v040-secondary" onClick={onOpenChat}>
          <MessageCircle size={18} /> Continue chatting
        </button>
        <button type="button" className="v040-primary" onClick={onRestart}>
          <RotateCcw size={18} /> Start another search
        </button>
      </div>
    </div>
  );
}
