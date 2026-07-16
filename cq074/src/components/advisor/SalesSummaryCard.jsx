import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Gauge,
  MessageSquareText,
  PhoneCall,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function SalesSummaryCard({ summary, order, onRestart }) {
  if (!summary) return null;
  const { customer, household, recommendation, quote, conversation, advisorNotes } = summary;

  return (
    <div className="v040-sales-summary">
      <header className="v040-sales-summary-hero">
        <div>
          <span><Sparkles size={16} /> Sales-ready opportunity</span>
          <h2>We’ve got it, {customer.name || "there"}.</h2>
          <p>Your recommendation and quote are packaged for ConnectIQ advisor review.</p>
        </div>
        <div className="v040-sales-readiness">
          <strong>{advisorNotes.readinessScore}%</strong>
          <span>{advisorNotes.readinessStatus}</span>
          <small>{advisorNotes.leadQuality}</small>
        </div>
      </header>

      <section className="v040-sales-reference">
        <BadgeCheck size={22} />
        <div><span>Reference number</span><strong>{String(order?.id || summary.summaryId).slice(0, 8).toUpperCase()}</strong></div>
        <div><span>Summary version</span><strong>{summary.summaryVersion}</strong></div>
      </section>

      <div className="v040-sales-summary-grid">
        <section>
          <h3><Users size={18} /> Customer snapshot</h3>
          <dl>
            <div><dt>Service address</dt><dd>{customer.serviceAddress}</dd></div>
            <div><dt>Household</dt><dd>{household.people} people · {household.devices} devices</dd></div>
            <div><dt>Budget target</dt><dd>{currency(household.budget)}/month</dd></div>
            <div><dt>Primary priority</dt><dd>{household.priority}</dd></div>
            <div><dt>Usage</dt><dd>{household.usage.join(", ") || "General use"}</dd></div>
          </dl>
        </section>

        <section>
          <h3><Gauge size={18} /> Recommendation</h3>
          <dl>
            <div><dt>Provider</dt><dd>{recommendation.provider}</dd></div>
            <div><dt>Plan</dt><dd>{recommendation.plan}</dd></div>
            <div><dt>Speed</dt><dd>{recommendation.download} Mbps down · {recommendation.upload} Mbps up</dd></div>
            <div><dt>Match score</dt><dd>{recommendation.matchScore}%</dd></div>
            <div><dt>Technology</dt><dd>{recommendation.technology}</dd></div>
          </dl>
        </section>

        <section>
          <h3><ClipboardList size={18} /> Quote snapshot</h3>
          <dl>
            <div><dt>Monthly estimate</dt><dd>{currency(quote.monthlyPrice)}</dd></div>
            <div><dt>Quote status</dt><dd>{quote.status}</dd></div>
            <div><dt>Pricing source</dt><dd>{quote.pricingSource}</dd></div>
            <div><dt>Installation</dt><dd>{quote.installationMethod}</dd></div>
            <div><dt>Scheduling</dt><dd>{quote.installationWindow}</dd></div>
          </dl>
        </section>

        <section>
          <h3><Target size={18} /> Advisor coaching</h3>
          <dl>
            <div><dt>Likely objection</dt><dd>{advisorNotes.likelyObjection}</dd></div>
            <div><dt>Primary selling point</dt><dd>{advisorNotes.primarySellingPoint}</dd></div>
            <div><dt>Next action</dt><dd>{advisorNotes.nextAction}</dd></div>
          </dl>
        </section>
      </div>

      <section className="v040-sales-reasoning">
        <h3><CheckCircle2 size={18} /> AI recommendation summary</h3>
        <p>{recommendation.summary}</p>
        <div>{recommendation.reasons.map((reason) => <span key={reason}><CheckCircle2 size={15} />{reason}</span>)}</div>
      </section>

      <section className="v040-sales-conversation">
        <MessageSquareText size={19} />
        <div><strong>Conversation summary</strong><p>{conversation.summary}</p></div>
      </section>

      <section className="v040-sales-next-step">
        <PhoneCall size={22} />
        <div><span>Recommended next step</span><strong>{advisorNotes.nextAction}</strong><small>Final pricing, promotions, eligibility, and installation require provider confirmation.</small></div>
      </section>

      <details className="v040-sales-details">
        <summary>Advisor talking points <ArrowRight size={17} /></summary>
        <div>{advisorNotes.suggestedTalkingPoints.map((point) => <p key={point}>• {point}</p>)}</div>
      </details>

      <button type="button" className="v040-primary" onClick={onRestart}>Start another search</button>
    </div>
  );
}
