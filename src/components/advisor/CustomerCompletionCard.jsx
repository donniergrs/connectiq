import { BadgeCheck, CheckCircle2, MessageCircle, RotateCcw, Sparkles } from "lucide-react";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

export default function CustomerCompletionCard({ completion, onRestart, onOpenChat }) {
  if (!completion) return null;
  return (
    <div className="v110-customer-completion">
      <header className="v110-completion-hero">
        <span><Sparkles size={16} /> Request received</span>
        <h2>🎉 You’re on your way, {completion.customerName}!</h2>
        <p>We have everything we need to start helping you get connected.</p>
      </header>

      <section className="v110-reference-card">
        <BadgeCheck size={26} />
        <div><span>Your ConnectIQ reference number</span><strong>{completion.referenceNumber}</strong><small>Keep this number for your records.</small></div>
      </section>

      <section className="v110-confirmation-summary">
        <div><span>Your ConnectIQ Pick</span><strong>{completion.provider}</strong><small>{completion.plan}</small></div>
        <div><span>Estimated monthly price</span><strong>{currency(completion.monthlyPrice)}</strong><small>{completion.pricingLabel}</small></div>
        <div><span>We will contact you by</span><strong>{completion.contactMethods.length ? completion.contactMethods.join(", ") : "Your preferred method"}</strong><small>{completion.responseExpectation}</small></div>
      </section>

      <section className="v110-next-steps-card">
        <h3>What happens next?</h3>
        {completion.nextSteps.map((step, index) => <p key={step}><span>{index + 1}</span><CheckCircle2 size={17} />{step}</p>)}
      </section>

      <p className="v040-customer-disclaimer">{completion.disclaimer}</p>
      <div className="v040-customer-completion-actions">
        <button type="button" className="v040-secondary" onClick={onOpenChat}><MessageCircle size={18} /> Ask a question</button>
        <button type="button" className="v040-primary" onClick={onRestart}><RotateCcw size={18} /> Start another search</button>
      </div>
    </div>
  );
}
