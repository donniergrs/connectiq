import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ShieldCheck, Sparkles, Zap } from "lucide-react";
import AdvisorProgress from "../components/advisor/AdvisorProgress";
import AdvisorConversation from "../components/advisor/AdvisorConversation";
import CustomerProfile from "../components/advisor/CustomerProfile";
import ProviderCardV2 from "../components/advisor/ProviderCardV2";
import ScoreBreakdown from "../components/advisor/ScoreBreakdown";
import { createBrainSession, lookupAddressWithBrain, updateNeedsWithBrain } from "../services/brain/brain";
import { answerQuestionMessage } from "../services/brain/conversationEngine";
import { CONVERSATION_STATES } from "../services/brain/conversationState";
import { createReadyToSubmitOrder } from "../services/brain/orderEngine";
import { buildQuote } from "../services/brain/quoteEngine";
import { advisorMessageForStep } from "../services/brain/advisor/advisorEngine";
import { recommendationConfidence } from "../services/brain/explainability";
import { trackConversionEvent } from "../services/brain/analyticsTracker";

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

const PRIORITIES = [
  ["reliability", "Most reliable"],
  ["price", "Lowest monthly cost"],
  ["speed", "Fastest available"],
];

const NEEDS = [
  ["workFromHome", "Remote work"],
  ["streaming", "Streaming TV"],
  ["gaming", "Online gaming"],
  ["creator", "Uploading content"],
  ["reliability", "Maximum reliability"],
];

const STORAGE_KEY = "connectiq:advisor:v0.4.0";

function loadSavedAdvisorState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return null;
    return saved;
  } catch {
    return null;
  }
}

function stepIndex(step) {
  if ([CONVERSATION_STATES.GREETING, CONVERSATION_STATES.ADDRESS, CONVERSATION_STATES.LOOKUP].includes(step)) return 0;
  if (step === CONVERSATION_STATES.DISCOVERY) return 1;
  if ([CONVERSATION_STATES.RECOMMENDATION, CONVERSATION_STATES.COMPARE].includes(step)) return 2;
  if ([CONVERSATION_STATES.QUOTE, CONVERSATION_STATES.CUSTOMER_INFO].includes(step)) return 3;
  return 4;
}

export default function InternetAdvisor() {
  const savedState = useMemo(loadSavedAdvisorState, []);
  const [session, setSession] = useState(() => savedState?.session || createBrainSession());
  const [address, setAddress] = useState(() => savedState?.address || "");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(() => savedState?.messages || [{ role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.GREETING) }]);
  const [customer, setCustomer] = useState(() => savedState?.customer || { name: "", email: "", phone: "", consent: false });
  const [contactStep, setContactStep] = useState(() => savedState?.contactStep || 0);
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState("lookup");
  const [busyStep, setBusyStep] = useState(0);
  const [order, setOrder] = useState(() => savedState?.order || null);

  const { providers, recommendation, quote, needs, step } = session;
  const confidence = useMemo(() => recommendationConfidence(providers), [providers]);
  const selectedId = recommendation?.id || recommendation?.providerId || recommendation?.displayName;

  useEffect(() => {
    const stateToSave = { session, address, messages, customer, contactStep, order };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [session, address, messages, customer, contactStep, order]);

  useEffect(() => {
    if (!busy) {
      setBusyStep(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setBusyStep((current) => Math.min(current + 1, 3));
    }, 650);
    return () => window.clearInterval(timer);
  }, [busy, busyMode]);

  async function findOptions(event) {
    event.preventDefault();
    if (!address.trim() || busy) return;
    setBusyMode("lookup");
    setBusyStep(0);
    setBusy(true);
    const lookupSession = { ...session, step: CONVERSATION_STATES.LOOKUP, address: address.trim() };
    setSession(lookupSession);
    setMessages((current) => [...current, { role: "customer", text: address.trim() }, { role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.LOOKUP) }]);
    const result = await lookupAddressWithBrain(lookupSession, address.trim());
    setSession(result);
    setMessages((current) => [...current, { role: "advisor", text: result.error || advisorMessageForStep(result.step, result) }]);
    setBusy(false);
    if (!result.error) trackConversionEvent("providers_found", result, { providerCount: result.providers.length });
  }

  function updateNeed(key, value) {
    setSession((current) => ({ ...updateNeedsWithBrain(current, { ...current.needs, [key]: value }), step: CONVERSATION_STATES.DISCOVERY }));
  }

  function showRecommendation() {
    const next = { ...session, step: CONVERSATION_STATES.RECOMMENDATION };
    setSession(next);
    setMessages((current) => [...current, { role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.RECOMMENDATION, next) }]);
    trackConversionEvent("recommendation_viewed", next, { confidence });
  }

  function chooseProvider(provider) {
    const selected = { ...provider };
    const nextQuote = buildQuote({ recommendation: selected, address: session.address, needs });
    const next = { ...session, recommendation: selected, quote: nextQuote, selectedProviderId: provider.id || provider.providerId || provider.displayName, step: CONVERSATION_STATES.RECOMMENDATION };
    setSession(next);
    setMessages((current) => [...current, { role: "customer", text: `I’m interested in ${provider.displayName}.` }, { role: "advisor", text: `${provider.displayName} is selected. I updated your quote and recommendation details.` }]);
    trackConversionEvent("provider_selected", next);
  }

  function openQuote() {
    const next = { ...session, step: CONVERSATION_STATES.QUOTE };
    setSession(next);
    setMessages((current) => [...current, { role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.QUOTE, next) }]);
    trackConversionEvent("quote_viewed", next);
  }

  function askAdvisor(event) {
    event.preventDefault();
    if (!question.trim()) return;
    const customerMessage = question.trim();
    const answer = answerQuestionMessage(customerMessage, { recommendation, quote, providers, needs });
    setMessages((current) => [...current, { role: "customer", text: customerMessage }, answer]);
    setQuestion("");
  }

  function beginOrder() {
    const next = { ...session, step: CONVERSATION_STATES.CUSTOMER_INFO };
    setSession(next);
    setMessages((current) => [...current, { role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.CUSTOMER_INFO, next) }]);
    trackConversionEvent("order_started", next);
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!customer.name || !customer.email || !customer.phone || !customer.consent || busy) return;
    setBusyMode("order");
    setBusyStep(0);
    setBusy(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const created = await createReadyToSubmitOrder({
        customer,
        address: session.address,
        providers,
        recommendation,
        quote,
        conversation: messages,
        needs,
        campaign: { source: params.get("utm_source") || "AI Advisor v0.4.0", medium: params.get("utm_medium") || "", campaign: params.get("utm_campaign") || "" },
      });
      const next = { ...session, step: CONVERSATION_STATES.READY, orderId: created.id, leadId: created.leadId };
      setSession(next);
      setOrder(created);
      setMessages((current) => [...current, { role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.READY, next) }]);
      trackConversionEvent("ready_to_submit_order_created", next, { orderId: created.id });
    } catch (error) {
      setMessages((current) => [...current, { role: "advisor", text: error?.message || "I couldn’t create the order package. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setSession(createBrainSession());
    setAddress("");
    setQuestion("");
    setMessages([{ role: "advisor", text: advisorMessageForStep(CONVERSATION_STATES.GREETING) }]);
    setCustomer({ name: "", email: "", phone: "", consent: false });
    setContactStep(0);
    setOrder(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="v040-page">
      <header className="v040-nav"><a href="/" className="v040-logo">Connect<span>IQ</span></a><div><ShieldCheck size={16} /> Independent broadband guidance</div></header>
      <section className="v040-shell">
        <div className="v040-intro">
          <span className="v040-kicker"><Sparkles size={15} /> ConnectIQ AI Advisor</span>
          <h1>Find internet that actually fits your household.</h1>
          <p>We check your address, compare available technologies, and explain the best choice without sending you to carrier websites.</p>
          <div className="v040-value"><span><CheckCircle2 /> Address-level availability</span><span><CheckCircle2 /> Personalized recommendation</span><span><CheckCircle2 /> One guided order</span></div>
        </div>

        <div className="v040-workspace">
          <AdvisorProgress activeIndex={stepIndex(step)} />
          <div className="v040-advisor-layout">
            <AdvisorConversation messages={messages} busy={busy} busyMode={busyMode} busyStep={busyStep} />
            <div className="v040-stage">

          {[CONVERSATION_STATES.GREETING, CONVERSATION_STATES.ADDRESS, CONVERSATION_STATES.LOOKUP, CONVERSATION_STATES.ERROR].includes(step) && !order && (
            <section className="v040-panel v040-address-panel">
              <span className="v040-step-label">Step 1 of 5</span><h2>Where do you need service?</h2><p>Enter the full service address so I can check provider availability.</p>
              <form
  onSubmit={findOptions}
  style={{
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
    width: "100%",
  }}
>
  <input
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    placeholder="101 Main St, Greenville, SC 29601"
    autoComplete="street-address"
    required
    style={{
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
    }}
  />
  <button
    disabled={busy}
    style={{
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      whiteSpace: "normal",
    }}
  >
    {busy ? "Checking providers..." : (
      <>
        Check my address <ArrowRight size={18} />
      </>
    )}
  </button>
</form>
              {session.error && <p className="v040-error">{session.error}</p>}
              <small>Your address is used only to verify internet availability.</small>
            </section>
          )}

          {step === CONVERSATION_STATES.DISCOVERY && (
            <section className="v040-panel">
              <span className="v040-step-label">Step 2 of 5</span><h2>Help me understand your household.</h2><p>I found <b>{providers.length} providers</b>. These answers improve your recommendation.</p>
              <div className="v040-number-fields"><label>People in the home<input type="number" min="1" max="20" value={needs.people} onChange={(e) => updateNeed("people", Number(e.target.value))} /></label><label>Connected devices<input type="number" min="1" max="100" value={needs.devices} onChange={(e) => updateNeed("devices", Number(e.target.value))} /></label><label>Target monthly budget<input type="number" min="30" max="500" value={needs.budget} onChange={(e) => updateNeed("budget", Number(e.target.value))} /></label></div>
              <div className="v040-question-block"><strong>What matters most?</strong><div className="v040-choice-row">{PRIORITIES.map(([key, label]) => <button type="button" className={needs.priority === key ? "is-selected" : ""} onClick={() => updateNeed("priority", key)} key={key}>{label}</button>)}</div></div>
              <div className="v040-question-block"><strong>How will you use the connection?</strong><div className="v040-choice-row">{NEEDS.map(([key, label]) => <button type="button" className={needs[key] ? "is-selected" : ""} onClick={() => updateNeed(key, !needs[key])} key={key}>{needs[key] ? "✓ " : "+ "}{label}</button>)}</div></div>
              <button className="v040-primary" type="button" onClick={showRecommendation}>Show my recommendation <ArrowRight size={18} /></button>
            </section>
          )}

          {step === CONVERSATION_STATES.RECOMMENDATION && recommendation && (
            <section className="v040-panel">
              <span className="v040-step-label">Step 3 of 5</span><div className="v040-recommend-head"><div><span className="v040-best-badge">Best match</span><h2>{recommendation.displayName}</h2><p>{recommendation.recommendationReason}</p></div><div className="v040-score"><strong>{recommendation.advisorScore}</strong><span>/100 match</span><small>{confidence}% confidence</small></div></div>
              <div className="v040-rec-grid"><div><h3>Why it fits your household</h3><ScoreBreakdown breakdown={recommendation.scoreBreakdown} /></div><div className="v040-rec-summary"><h3>Recommended service</h3><div><span>Technology</span><b>{recommendation.technology}</b></div><div><span>Download</span><b>{recommendation.download || "—"} Mbps</b></div><div><span>Upload</span><b>{recommendation.upload || "—"} Mbps</b></div><div><span>Estimated monthly</span><b>{currency(quote?.monthlyPrice)}</b></div></div></div>
              <div className="v040-provider-grid">{providers.slice(0, 3).map((provider, index) => <ProviderCardV2 key={provider.id || provider.displayName} provider={provider} needs={needs} rank={index} selected={(provider.id || provider.providerId || provider.displayName) === selectedId} onSelect={chooseProvider} />)}</div>
              <form className="v040-ask" onSubmit={askAdvisor}><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about price, Wi-Fi, gaming, installation, or switching..." /><button>Ask advisor</button></form>
              <button className="v040-primary" type="button" onClick={openQuote}>Continue with {recommendation.displayName} <ArrowRight size={18} /></button>
            </section>
          )}

          {step === CONVERSATION_STATES.QUOTE && quote && (
            <section className="v040-panel">
              <button className="v040-back" onClick={() => setSession({ ...session, step: CONVERSATION_STATES.RECOMMENDATION })}><ChevronLeft size={16} /> Back to comparison</button>
              <span className="v040-step-label">Step 4 of 5</span><h2>Your personalized internet estimate</h2><p>Based on your address and household needs.</p>
              <div className="v040-quote"><div><span>Recommended provider</span><h3>{quote.provider}</h3><p>{quote.productName}</p></div><div className="v040-price"><strong>{currency(quote.monthlyPrice)}</strong><span>estimated monthly</span></div><div className="v040-quote-details"><span><b>{quote.download} Mbps</b> download</span><span><b>{quote.upload} Mbps</b> upload</span><span><b>{quote.technology}</b> technology</span><span><b>{quote.contract}</b></span></div><div className="v040-promo"><Zap size={18} /><span><b>Current offer:</b> {quote.promotion}</span></div></div>
              <p className="v040-disclaimer">{quote.disclaimer}</p>
              <button className="v040-primary" type="button" onClick={beginOrder}>Start my order <ArrowRight size={18} /></button>
            </section>
          )}

          {step === CONVERSATION_STATES.CUSTOMER_INFO && (
            <section className="v040-panel v040-contact-panel">
              <span className="v040-step-label">Step 5 of 5</span><h2>Almost done.</h2><p>I’ll create a Ready-to-Submit order package. No payment is collected here.</p>
              <form onSubmit={submitOrder}>
                {contactStep === 0 && <label>What is your full name?<input autoFocus value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" required /><button type="button" disabled={!customer.name.trim()} onClick={() => setContactStep(1)}>Continue <ArrowRight size={18} /></button></label>}
                {contactStep === 1 && <label>What is the best email address?<input autoFocus type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Email address" required /><button type="button" disabled={!customer.email.trim()} onClick={() => setContactStep(2)}>Continue <ArrowRight size={18} /></button></label>}
                {contactStep === 2 && <label>What is the best phone number?<input autoFocus value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone number" required /><button type="button" disabled={!customer.phone.trim()} onClick={() => setContactStep(3)}>Review consent <ArrowRight size={18} /></button></label>}
                {contactStep === 3 && <div className="v040-final-contact"><div><span>Name</span><b>{customer.name}</b></div><div><span>Email</span><b>{customer.email}</b></div><div><span>Phone</span><b>{customer.phone}</b></div><label className="v040-consent"><input type="checkbox" checked={customer.consent} onChange={(e) => setCustomer({ ...customer, consent: e.target.checked })} /><span>I agree that ConnectIQ may contact me about this internet request by phone, text, or email.</span></label><button className="v040-primary" disabled={!customer.consent || busy}>{busy ? "Creating order..." : "Create Ready-to-Submit Order"}</button></div>}
              </form>
            </section>
          )}

          {order && (
            <section className="v040-panel v040-success"><CheckCircle2 /><span>Order package created</span><h2>We’ve got it, {customer.name}.</h2><p>ConnectIQ will verify the final provider offer and installation availability before submission.</p><div><small>Reference number</small><strong>{order.id.slice(0, 8).toUpperCase()}</strong></div><button type="button" onClick={restart}>Start another search</button></section>
          )}
            </div>
            <CustomerProfile address={session.address || address} needs={needs} providers={providers} recommendation={recommendation} />
          </div>
        </div>
      </section>
      <footer className="v040-footer"><span>ConnectIQ does not collect payment on this page.</span><span>Final pricing and availability require provider confirmation.</span></footer>
    </main>
  );
}

