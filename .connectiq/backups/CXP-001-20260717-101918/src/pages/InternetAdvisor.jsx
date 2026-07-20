import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, MessageCircle, ShieldCheck, Sparkles, X } from "lucide-react";
import AdvisorProgress from "../components/advisor/AdvisorProgress";
import AdvisorConversation from "../components/advisor/AdvisorConversation";
import CustomerProfile from "../components/advisor/CustomerProfile";
import ProviderCardV2 from "../components/advisor/ProviderCardV2";
import ProfessionalQuoteCard from "../components/advisor/ProfessionalQuoteCard";
import CustomerCompletionCard from "../components/advisor/CustomerCompletionCard";
import { lookupAddressWithBrain, updateNeedsWithBrain } from "../services/brain/brain";
import { answerQuestionMessage } from "../services/brain/conversationEngine";
import { CONVERSATION_STATES } from "../services/brain/conversationState";
import { createReadyToSubmitOrder } from "../services/brain/orderEngine";
import { buildQuote } from "../services/brain/quoteEngine";
import { recommendationConfidence } from "../services/brain/explainability";
import { trackConversionEvent } from "../services/brain/analyticsTracker";
import { buildSalesSummary } from "../services/brain/salesSummary";
import { buildCustomerCompletion } from "../services/brain/customerCompletion";
import { calculateLeadScore } from "../services/brain/leadScoring";
import { useCustomerContext } from "../context/CustomerContext";

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

function stepIndex(step) {
  if ([CONVERSATION_STATES.GREETING, CONVERSATION_STATES.ADDRESS, CONVERSATION_STATES.LOOKUP].includes(step)) return 0;
  if (step === CONVERSATION_STATES.DISCOVERY) return 1;
  if ([CONVERSATION_STATES.RECOMMENDATION, CONVERSATION_STATES.COMPARE].includes(step)) return 2;
  if ([CONVERSATION_STATES.QUOTE, CONVERSATION_STATES.CUSTOMER_INFO].includes(step)) return 3;
  return 4;
}

export default function InternetAdvisor({ embedded = false }) {
  const {
    session,
    setSession,
    address,
    setAddress,
    messages,
    setMessages,
    customer,
    setCustomer,
    contactStep,
    setContactStep,
    discoveryStep,
    setDiscoveryStep,
    order,
    setOrder,
    chatOpen,
    setChatOpen,
    resetCustomerContext,
  } = useCustomerContext();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState("lookup");
  const [busyStep, setBusyStep] = useState(0);
  const [chatResponding, setChatResponding] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const { providers, recommendation, quote, needs, step } = session;
  const confidence = useMemo(() => recommendationConfidence(providers), [providers]);
  const selectedId = recommendation?.id || recommendation?.providerId || recommendation?.displayName;
  const customerCompletion = useMemo(() => order ? buildCustomerCompletion({ order, recommendation, quote, customer }) : null, [order, recommendation, quote, customer]);
  const leadScore = useMemo(() => calculateLeadScore({ customer, providers, recommendation, needs }), [customer, providers, recommendation, needs]);
  const selectedContactCount = Object.values(customer.contactPreferences || {}).filter(Boolean).length;
  const hasRequiredContact = Boolean(customer.name?.trim()) && (!customer.contactPreferences?.email || Boolean(customer.email?.trim())) && (!(customer.contactPreferences?.text || customer.contactPreferences?.phone) || Boolean(customer.phone?.trim()));

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
    const result = await lookupAddressWithBrain(lookupSession, address.trim());
    setSession(result);
    if (result.error) {
      setMessages((current) => [...current, { role: "advisor", text: result.error }]);
    }
    setBusy(false);
    if (!result.error) trackConversionEvent("providers_found", result, { providerCount: result.providers.length });
  }


  const discoveryQuestions = [
    {
      key: "people",
      title: "How many people use the internet in your home?",
      helper: "This helps me estimate simultaneous usage.",
      options: [[1, "1 person"], [2, "2 people"], [3, "3 people"], [4, "4 people"], [5, "5+ people"]],
    },
    {
      key: "devices",
      title: "About how many devices connect regularly?",
      helper: "Include phones, TVs, computers, tablets, cameras, and smart-home devices.",
      options: [[5, "1–5 devices"], [10, "6–10 devices"], [20, "11–20 devices"], [35, "More than 20"]],
    },
    {
      key: "priority",
      title: "What matters most to you?",
      helper: "I’ll use this as the leading factor in your recommendation.",
      options: PRIORITIES.map(([value, label]) => [value, label]),
    },
    {
      key: "usage",
      title: "How will your household use the connection?",
      helper: "Choose everything that applies, then continue.",
    },
    {
      key: "budget",
      title: "What monthly budget should I target?",
      helper: "Final pricing is confirmed with the provider before an order is submitted.",
      options: [[60, "Under $70"], [85, "$70–$99"], [120, "$100–$129"], [160, "$130+"]],
    },
  ];

  const currentDiscoveryQuestion = discoveryQuestions[Math.min(discoveryStep, discoveryQuestions.length - 1)];

  function answerDiscovery(key, value) {
    const updatedNeeds = { ...needs, [key]: value };
    const nextSession = { ...updateNeedsWithBrain(session, updatedNeeds), step: CONVERSATION_STATES.DISCOVERY };
    setSession(nextSession);
    setDiscoveryStep((current) => Math.min(current + 1, discoveryQuestions.length));
  }

  function continueUsageDiscovery() {
    const selected = NEEDS.filter(([key]) => needs[key]).map(([, label]) => label);
    answerDiscovery("usageComplete", true, selected.length ? selected.join(", ") : "General browsing and everyday use");
  }

  function updateNeed(key, value) {
    setSession((current) => ({ ...updateNeedsWithBrain(current, { ...current.needs, [key]: value }), step: CONVERSATION_STATES.DISCOVERY }));
  }

  function showRecommendation() {
    const next = { ...session, step: CONVERSATION_STATES.RECOMMENDATION };
    setChatOpen(false);
    setSession(next);
    trackConversionEvent("recommendation_viewed", next, { confidence });
  }

  function chooseProvider(provider) {
    const selected = { ...provider };
    const nextQuote = buildQuote({ recommendation: selected, address: session.address, needs });
    const next = { ...session, recommendation: selected, quote: nextQuote, selectedProviderId: provider.id || provider.providerId || provider.displayName, step: CONVERSATION_STATES.RECOMMENDATION };
    setSession(next);
    trackConversionEvent("provider_selected", next);
  }

  function openQuote() {
    const next = { ...session, step: CONVERSATION_STATES.QUOTE };
    setSession(next);
    trackConversionEvent("quote_viewed", next);
  }

  async function askAdvisor(event) {
    event.preventDefault();
    if (!question.trim() || chatResponding) return;
    const customerMessage = question.trim();
    setQuestion("");
    setMessages((current) => [...current, { role: "customer", text: customerMessage }]);
    setChatResponding(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const answer = answerQuestionMessage(customerMessage, { recommendation, quote, providers, needs, address: session.address, conversation: messages });
    setMessages((current) => [...current, answer]);
    setChatResponding(false);
  }

  function beginOrder() {
    const next = { ...session, step: CONVERSATION_STATES.CUSTOMER_INFO };
    setSession(next);
    trackConversionEvent("order_started", next);
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!hasRequiredContact || selectedContactCount === 0 || !customer.consent || busy) return;
    setBusyMode("order");
    setBusyStep(0);
    setBusy(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const salesSummary = buildSalesSummary({
        customer,
        address: session.address,
        providers,
        recommendation,
        quote,
        conversation: messages,
        needs,
      });
      const created = await createReadyToSubmitOrder({
        customer,
        address: session.address,
        providers,
        recommendation,
        quote,
        conversation: messages,
        needs,
        salesSummary,
        campaign: { source: params.get("utm_source") || "AI Advisor v0.4.0", medium: params.get("utm_medium") || "", campaign: params.get("utm_campaign") || "" },
      });
      const next = { ...session, step: CONVERSATION_STATES.READY, orderId: created.id, leadId: created.leadId };
      setSession(next);
      setOrder(created);
      trackConversionEvent("ready_to_submit_order_created", next, { orderId: created.id });
    } catch (error) {
      setMessages((current) => [...current, { role: "advisor", text: error?.message || "I couldn’t create the order package. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setQuestion("");
    resetCustomerContext({ openChat: false });
  }

  return (
    <main className="v040-page">
      {!embedded && <header className="v040-nav"><a href="/" className="v040-logo">Connect<span>IQ</span></a><div><ShieldCheck size={16} /> Independent broadband guidance</div></header>}
      <section className="v040-shell">
        <div className="v040-intro">
          <span className="v040-kicker"><Sparkles size={15} /> ConnectIQ AI Advisor</span>
          <h1>Find internet that fits your home.</h1>
          <p>Enter your address, answer a few simple questions, and I’ll help you choose a good option.</p>
          <div className="v040-value"><span><CheckCircle2 /> Address-level availability</span><span><CheckCircle2 /> Personalized recommendation</span><span><CheckCircle2 /> One guided order</span></div>
        </div>

        <div className="v040-workspace">
          <AdvisorProgress activeIndex={stepIndex(step)} />
          <div className="v040-advisor-layout">
            <div className="v040-stage">

          {[CONVERSATION_STATES.GREETING, CONVERSATION_STATES.ADDRESS, CONVERSATION_STATES.LOOKUP, CONVERSATION_STATES.ERROR].includes(step) && !order && (
            <section className="v040-panel v040-address-panel">
              <span className="v040-step-label">Step 1 of 5</span><h2>Where do you need internet?</h2><p>Type your full address below to see what is available.</p>
              <form onSubmit={findOptions} style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", width: "100%" }}><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="101 Main St, Greenville, SC 29601" autoComplete="street-address" required style={{ width: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }} /><button disabled={busy} style={{ width: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box", whiteSpace: "normal" }}>{busy ? "Checking providers..." : <>Check my address <ArrowRight size={18} /></>}</button></form>
              {session.error && <p className="v040-error">{session.error}</p>}
              <small>Your address is used only to verify internet availability.</small>
            </section>
          )}

          {step === CONVERSATION_STATES.DISCOVERY && (
            <section className="v040-panel v040-guided-discovery">
              <span className="v040-step-label">Step 2 of 5</span>
              {discoveryStep < discoveryQuestions.length ? (
                <>
                  <div className="v040-discovery-progress"><span style={{ width: `${((discoveryStep + 1) / discoveryQuestions.length) * 100}%` }} /></div>
                  <small className="v040-discovery-count">Question {discoveryStep + 1} of {discoveryQuestions.length}</small>
                  <h2>{currentDiscoveryQuestion.title}</h2>
                  <p>{currentDiscoveryQuestion.helper}</p>
                  {currentDiscoveryQuestion.key === "usage" ? (
                    <>
                      <div className="v040-discovery-options is-multi">{NEEDS.map(([key, label]) => <button type="button" className={needs[key] ? "is-selected" : ""} onClick={() => updateNeed(key, !needs[key])} key={key}>{needs[key] ? "✓ " : "+ "}{label}</button>)}</div>
                      <button className="v040-primary" type="button" onClick={continueUsageDiscovery}>Continue <ArrowRight size={18} /></button>
                    </>
                  ) : (
                    <div className="v040-discovery-options">{currentDiscoveryQuestion.options.map(([value, label]) => <button type="button" key={`${currentDiscoveryQuestion.key}-${value}`} onClick={() => answerDiscovery(currentDiscoveryQuestion.key, value, label)}>{label}<ArrowRight size={16} /></button>)}</div>
                  )}
                </>
              ) : (
                <div className="v040-discovery-ready">
                  <CheckCircle2 />
                  <span>All done</span>
                  <h2>I found a good option for your home.</h2>
                  <p>I used your answers to choose an option that should work well for your family.</p>
                  <button className="v040-primary" type="button" onClick={showRecommendation}>Show my ConnectIQ Pick <ArrowRight size={18} /></button>
                </div>
              )}
            </section>
          )}

          {step === CONVERSATION_STATES.RECOMMENDATION && recommendation && (
            <section className="v040-panel v040-simple-pick">
              <span className="v040-step-label">Step 3 of 5</span>
              <div className="v040-recommend-head">
                <div>
                  <span className="v040-best-badge">⭐ ConnectIQ Pick</span>
                  <h2>{recommendation.revenueProduct?.productName || recommendation.displayName}</h2>
                  <p>Here’s what I would choose for your home.</p>
                </div>
                <div className="v040-simple-match"><strong>👍</strong><span>{recommendation.recommendationTier || "Great Match"}</span></div>
              </div>
              <div className="v040-simple-reasons" aria-label="Why ConnectIQ picked this option">
                <h3>Why I picked it</h3>
                {(recommendation.recommendationReasons || [recommendation.recommendationReason]).filter(Boolean).slice(0, 3).map((reason) => <p key={reason}><CheckCircle2 size={18} />{reason}</p>)}
              </div>
              <div className="v040-rec-summary v040-simple-summary">
                <div><span>What it should handle</span><b>Work, school, TV, gaming, and everyday use</b></div>
                <div><span>Estimated monthly price</span><b>{currency(quote?.monthlyPrice)}</b></div>
                <small>Final price and plan details are confirmed before your order is submitted.</small>
              </div>
              {providers.length > 1 && (
                <button className="v040-secondary v040-other-options" type="button" onClick={() => setShowAlternatives((current) => !current)}>
                  {showAlternatives ? "Hide other options" : `See ${providers.length - 1} other option${providers.length - 1 === 1 ? "" : "s"}`}
                </button>
              )}
              {showAlternatives && (
                <div className="v040-provider-scroll" aria-label="Other available provider options"><div className="v040-provider-grid">{providers.slice(1).map((provider, index) => <ProviderCardV2 key={provider.id || provider.displayName} provider={provider} needs={needs} rank={index + 1} selected={(provider.id || provider.providerId || provider.displayName) === selectedId} onSelect={chooseProvider} />)}</div></div>
              )}
              <div className="v040-recommend-actions">
                <button className="v040-secondary" type="button" onClick={() => setShowAlternatives((current) => !current)}><Sparkles size={18} /> Compare other options</button>
                <button className="v040-primary" type="button" onClick={openQuote}>This looks great <ArrowRight size={18} /></button>
              </div>
            </section>
          )}

          {step === CONVERSATION_STATES.QUOTE && quote && (
            <section className="v040-panel v040-quote-panel">
              <button className="v040-back" onClick={() => setSession({ ...session, step: CONVERSATION_STATES.RECOMMENDATION })}><ChevronLeft size={16} /> Back to comparison</button>
              <span className="v040-step-label">Step 4 of 5</span>
              <ProfessionalQuoteCard
                quote={quote}
                recommendation={recommendation}
                providers={providers}
                needs={needs}
                confidence={confidence}
                onContinue={beginOrder}
              />
            </section>
          )}

          {step === CONVERSATION_STATES.CUSTOMER_INFO && (
            <section className="v040-panel v040-contact-panel">
              <span className="v040-step-label">Step 5 of 5</span><h2>Almost done.</h2><p>I’ll create a Ready-to-Submit order package. No payment is collected here.</p>
              <form onSubmit={submitOrder}>
                {contactStep === 0 && <div className="v100-contact-step"><h3>How should we contact you?</h3><p>Choose one or more. We will only use the methods you select.</p><div className="v100-contact-choices">{[["text", "Text message"], ["phone", "Phone call"], ["email", "Email"]].map(([key, label]) => <label key={key} className={customer.contactPreferences?.[key] ? "is-selected" : ""}><input type="checkbox" checked={Boolean(customer.contactPreferences?.[key])} onChange={(e) => setCustomer({ ...customer, contactPreferences: { ...customer.contactPreferences, [key]: e.target.checked } })} /><span>{label}</span></label>)}</div><h3>How soon are you looking to switch?</h3><div className="v100-timeline">{[["today", "Today"], ["week", "This week"], ["month", "This month"], ["comparing", "Just comparing"]].map(([value, label]) => <button type="button" key={value} className={customer.buyingTimeline === value ? "is-selected" : ""} onClick={() => setCustomer({ ...customer, buyingTimeline: value })}>{label}</button>)}</div><button className="v040-primary" type="button" disabled={!selectedContactCount || !customer.buyingTimeline} onClick={() => setContactStep(1)}>Continue <ArrowRight size={18} /></button></div>}
                {contactStep === 1 && <label>What is your full name?<input autoFocus value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" required /><button type="button" disabled={!customer.name.trim()} onClick={() => setContactStep(customer.contactPreferences?.email ? 2 : 3)}>Continue <ArrowRight size={18} /></button></label>}
                {contactStep === 2 && <label>What is the best email address?<input autoFocus type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="Email address" required /><button type="button" disabled={!customer.email.trim()} onClick={() => setContactStep(customer.contactPreferences?.text || customer.contactPreferences?.phone ? 3 : 4)}>Continue <ArrowRight size={18} /></button></label>}
                {contactStep === 3 && <label>What is the best phone number?<input autoFocus value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone number" required /><button type="button" disabled={!customer.phone.trim()} onClick={() => setContactStep(4)}>Review my choices <ArrowRight size={18} /></button></label>}
                {contactStep === 4 && <div className="v110-review-request">
                  <header><span className="v040-best-badge">🏡 Review Your Request</span><h3>Make sure everything looks right.</h3><p>You are not paying for service today. A ConnectIQ Advisor will verify the final details with you.</p></header>
                  <div className="v110-review-grid">
                    <section><span>📍 Service address</span><b>{session.address || address}</b></section>
                    <section><span>⭐ Your ConnectIQ Pick</span><b>{recommendation?.revenueProduct?.productName || recommendation?.displayName || "Recommended internet option"}</b><small>{recommendation?.recommendationTier || "Great Match"}</small></section>
                    <section><span>👤 Name</span><b>{customer.name}</b></section>
                    <section><span>💬 We will contact you by</span><b>{Object.entries(customer.contactPreferences || {}).filter(([, enabled]) => enabled).map(([key]) => key === "text" ? "Text" : key === "phone" ? "Phone" : "Email").join(", ")}</b></section>
                    {customer.contactPreferences?.email && <section><span>Email</span><b>{customer.email}</b></section>}
                    {(customer.contactPreferences?.text || customer.contactPreferences?.phone) && <section><span>Phone</span><b>{customer.phone}</b></section>}
                    <section><span>⏱ Looking to switch</span><b>{{ today: "Today", week: "This week", month: "This month", comparing: "Just comparing" }[customer.buyingTimeline]}</b></section>
                  </div>
                  <div className="v110-next-step"><h4>What happens next?</h4><p>1. We verify the provider and plan.</p><p>2. An advisor contacts you the way you selected.</p><p>3. We help you complete the order.</p></div>
                  <label className="v100-future-offers"><input type="checkbox" checked={Boolean(customer.futureOffersOptIn)} onChange={(e) => setCustomer({ ...customer, futureOffersOptIn: e.target.checked })} /><span>Let me know if a better internet offer becomes available at my address.</span></label>
                  <label className="v040-consent"><input type="checkbox" checked={customer.consent} onChange={(e) => setCustomer({ ...customer, consent: e.target.checked })} /><span>I agree that ConnectIQ may contact me using the methods I selected above about this request. Message and data rates may apply. I can opt out at any time.</span></label>
                  <div className="v110-review-actions"><button type="button" className="v040-secondary" onClick={() => setContactStep(0)}>Edit my information</button><button className="v040-primary" disabled={!customer.consent || !hasRequiredContact || busy}>{busy ? "Creating your request..." : "🏡 Connect My Home"}</button></div>
                </div>}
              </form>
            </section>
          )}

          {order && (
            <section className="v040-panel v040-customer-completion-panel">
              <CustomerCompletionCard completion={customerCompletion} onRestart={restart} onOpenChat={() => setChatOpen(true)} />
            </section>
          )}
            </div>
            <CustomerProfile address={session.address || address} needs={needs} providers={providers} recommendation={recommendation} />
          </div>

          <button className="v040-chat-launcher" type="button" onClick={() => setChatOpen(true)} aria-label="Open ConnectIQ Advisor chat">
            <MessageCircle size={19} />
            <span>Chat with Advisor</span>
          </button>

          {chatOpen && (
            <div className="v040-chat-backdrop" onClick={() => setChatOpen(false)}>
              <aside className="v040-chat-drawer" role="dialog" aria-modal="true" aria-label="ConnectIQ Advisor chat" onClick={(event) => event.stopPropagation()}>
                <button className="v040-chat-close" type="button" onClick={() => setChatOpen(false)} aria-label="Close Advisor chat"><X size={18} /></button>
                <AdvisorConversation messages={messages} busy={busy} busyMode={busyMode} busyStep={busyStep} question={question} onQuestionChange={setQuestion} onSubmitQuestion={askAdvisor} responding={chatResponding} />
              </aside>
            </div>
          )}
        </div>
      </section>
      <footer className="v040-footer"><span>ConnectIQ does not collect payment on this page.</span><span>Final pricing and availability require provider confirmation.</span></footer>
    </main>
  );
}
