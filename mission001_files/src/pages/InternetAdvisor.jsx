import { useMemo, useState } from "react";
import { answerQuestionMessage, greetingMessage, providerRecommendationMessage } from "../services/brain/conversationEngine";
import { createBrainSession, lookupAddressWithBrain } from "../services/brain/brain";
import { createReadyToSubmitOrder } from "../services/brain/orderEngine";
import { CONVERSATION_STATES } from "../services/brain/conversationState";

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function InternetAdvisor() {
  const [state, setState] = useState(createBrainSession);
  const [messages, setMessages] = useState([greetingMessage()]);
  const [address, setAddress] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const recommendation = state.recommendation;
  const quote = state.quote;

  const canSubmit = useMemo(() => {
    return (
      customer.name.trim() &&
      customer.email.trim() &&
      customer.phone.trim() &&
      recommendation &&
      quote
    );
  }, [customer, recommendation, quote]);

  async function checkAddress(event) {
    event.preventDefault();
    if (!address.trim()) return;

    setBusy(true);
    setMessages((items) => [
      ...items,
      { role: "customer", text: address.trim() },
      { role: "advisor", text: "Checking provider availability and current recommendations..." },
    ]);

    const result = await lookupAddressWithBrain(state, address);
    setState(result);
    setBusy(false);

    if (result.error) {
      setMessages((items) => [
        ...items,
        { role: "advisor", text: result.error },
      ]);
      return;
    }

    setMessages((items) => [
      ...items,
      providerRecommendationMessage(result.recommendation, result.providers.length),
    ]);
  }

  function askQuestion(event) {
    event.preventDefault();
    if (!question.trim()) return;

    const response = answerQuestionMessage(question);
    setMessages((items) => [
      ...items,
      { role: "customer", text: question.trim() },
      response,
    ]);
    setQuestion("");
  }

  async function finishOrder(event) {
    event.preventDefault();
    if (!canSubmit || busy) return;

    setBusy(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const order = await createReadyToSubmitOrder({
        customer,
        address: state.address,
        providers: state.providers,
        recommendation,
        quote,
        conversation: messages,
        campaign: {
          source: params.get("utm_source") || "AI Internet Advisor",
          medium: params.get("utm_medium") || "",
          campaign: params.get("utm_campaign") || "",
        },
      });

      setSubmittedOrder(order);
      setState((current) => ({
        ...current,
        step: CONVERSATION_STATES.READY,
        orderId: order.id,
      }));
      setMessages((items) => [
        ...items,
        {
          role: "advisor",
          text:
            "You’re ready! Your information has been saved for final order submission. ConnectIQ will confirm the provider details and next installation steps.",
        },
      ]);
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          role: "advisor",
          text: error?.message || "We could not save your order. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mission001-page">
      <section className="mission001-hero">
        <div className="mission001-copy">
          <span className="mission001-kicker">Your Personal Internet Advisor</span>
          <h1>Find the best internet at your address in minutes.</h1>
          <p>
            Compare available providers, get a personalized recommendation, ask questions,
            and prepare your order without waiting for a callback.
          </p>

          <div className="mission001-trust">
            <span>✓ Address-based recommendations</span>
            <span>✓ Fast provider comparison</span>
            <span>✓ No-obligation quote</span>
          </div>
        </div>

        <div className="mission001-advisor">
          <div className="mission001-advisor-header">
            <div>
              <strong>ConnectIQ Internet Advisor</strong>
              <span>Online now</span>
            </div>
            <span className="mission001-live-dot" />
          </div>

          <div className="mission001-chat">
            {messages.map((message, index) => (
              <div
                className={`mission001-message is-${message.role}`}
                key={`${message.role}-${index}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          {!recommendation && !submittedOrder && (
            <form className="mission001-form" onSubmit={checkAddress}>
              <label>Service address</label>
              <div className="mission001-inline">
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="101 Main St, Greenville, SC 29601"
                  autoComplete="street-address"
                />
                <button type="submit" disabled={busy}>
                  {busy ? "Checking..." : "Find Options"}
                </button>
              </div>
            </form>
          )}

          {recommendation && !submittedOrder && (
            <>
              <section className="mission001-recommendation">
                <span>Top recommendation</span>
                <div className="mission001-rec-title">
                  <div>
                    <h2>{recommendation.displayName}</h2>
                    <p>{quote?.productName}</p>
                  </div>
                  <strong>{recommendation.advisorScore}/100</strong>
                </div>

                <div className="mission001-specs">
                  <div><strong>{recommendation.download || "—"}</strong><span>Mbps down</span></div>
                  <div><strong>{recommendation.upload || "—"}</strong><span>Mbps up</span></div>
                  <div><strong>{currency(quote?.monthlyPrice)}</strong><span>Estimated monthly</span></div>
                </div>

                <div className="mission001-offer">
                  <strong>{quote?.promotion}</strong>
                  <span>{quote?.contract}</span>
                </div>
              </section>

              <form className="mission001-question" onSubmit={askQuestion}>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about gaming, installation, Wi-Fi, or switching..."
                />
                <button type="submit">Ask</button>
              </form>

              <form className="mission001-order" onSubmit={finishOrder}>
                <div>
                  <span className="mission001-kicker">Continue your order</span>
                  <h3>Reserve this recommendation</h3>
                  <p>No payment is collected here. We use this information to prepare the order for final submission.</p>
                </div>

                <div className="mission001-customer-grid">
                  <input
                    value={customer.name}
                    onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                    placeholder="Email address"
                    autoComplete="email"
                  />
                  <input
                    value={customer.phone}
                    onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                    placeholder="Phone number"
                    autoComplete="tel"
                  />
                </div>

                <button type="submit" disabled={!canSubmit || busy}>
                  {busy ? "Saving..." : "Create Ready-to-Submit Order"}
                </button>
              </form>
            </>
          )}

          {submittedOrder && (
            <section className="mission001-success">
              <span>Order ready</span>
              <h2>Thank you, {customer.name}.</h2>
              <p>
                Your ConnectIQ order record has been created. We’ll confirm final pricing,
                eligibility, and installation availability before submission.
              </p>
              <strong>Reference: {submittedOrder.id.slice(0, 8).toUpperCase()}</strong>
            </section>
          )}
        </div>
      </section>

      <section className="mission001-how">
        <div>
          <span>1</span>
          <h3>Enter your address</h3>
          <p>ConnectIQ checks the provider data available for your location.</p>
        </div>
        <div>
          <span>2</span>
          <h3>Get a recommendation</h3>
          <p>Options are ranked using customer fit and ConnectIQ revenue intelligence.</p>
        </div>
        <div>
          <span>3</span>
          <h3>Prepare your order</h3>
          <p>Ask questions, review the offer, and create a ready-to-submit order.</p>
        </div>
      </section>
    </main>
  );
}
