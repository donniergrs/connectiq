/* eslint-disable no-unused-vars */
import { useMemo, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, LoaderCircle, Send, Sparkles, Wifi } from "lucide-react";
import { sendAdvisorTurn } from "../services/aiAdvisorService";
import { lookupProviderIntelligence } from "../services/provider-intelligence/index.js";
import { ensureAdvisorLead, syncAdvisorLead } from "../services/aiLeadLifecycleService";

const newSessionId = () => `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function providerName(provider) {
  return provider?.displayName || provider?.brand_name || provider?.provider_name || provider?.name || "Provider";
}

export default function AiSalesAdvisor() {
  const [sessionId] = useState(() => localStorage.getItem("connectiqAdvisorSession") || newSessionId());
  const [address, setAddress] = useState("");
  const [providers, setProviders] = useState([]);
  const [messages, setMessages] = useState([{ role: "advisor", text: "Welcome to ConnectIQ. Enter your address and I’ll help you compare the internet options available to you." }]);
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState(null);
  const [memory, setMemory] = useState({});
  const [busy, setBusy] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState([]);

  const _recommended = providers[0] || null;
  const progress = useMemo(() => {
    let value = 15;
    if (providers.length) value += 25;
    if (memory?.facts?.currentProvider) value += 15;
    if (memory?.facts?.monthlyBill) value += 15;
    if ((memory?.painPoints || []).length || (memory?.householdNeeds || []).length) value += 15;
    if (quote?.provider) value += 15;
    return Math.min(value, 100);
  }, [providers, memory, quote]);

  async function lookup(event) {
    event.preventDefault();
    if (!address.trim() || busy) return;
    setBusy(true);
    try {
      localStorage.setItem("connectiqAdvisorSession", sessionId);
      const result = await lookupProviderIntelligence(address.trim());
      const found = result.providers || [];
      setProviders(found);
      if (found.length) await ensureAdvisorLead({ sessionId, address: address.trim(), providers: found });
      setMessages((items) => [...items, { role: "customer", text: address.trim() }, { role: "advisor", text: found.length ? `I found ${found.length} provider option${found.length === 1 ? "" : "s"} at your address. Tell me about your current service so I can recommend the best fit.` : "I could not confirm providers at that address yet. Please verify the address and try again." }]);
    } catch (error) {
      setMessages((items) => [...items, { role: "advisor", text: error.message }]);
    } finally { setBusy(false); }
  }

  async function submitTurn(text = message) {
    const clean = String(text || "").trim();
    if (!clean || busy) return;
    setMessage("");
    setSuggestedReplies([]);
    setMessages((items) => [...items, { role: "customer", text: clean }]);
    setBusy(true);
    try {
      const result = await sendAdvisorTurn({ sessionId, stage: quote?.provider ? "RECOMMENDATION" : "DISCOVERY", message: clean, providers, address });
      const advisorMessage = result.advisor?.message || result.response?.message || "Let’s continue.";
      setMemory(result.memory || {});
      setQuote(result.quote || null);
      setSuggestedReplies(result.advisor?.suggestedReplies || []);
      setMessages((items) => [...items, { role: "advisor", text: advisorMessage }]);
      await syncAdvisorLead({
        sessionId,
        address,
        providers,
        memory: result.memory || {},
        intelligence: result.salesIntelligence || {},
        quote: result.quote || null,
        customerMessage: clean,
        advisorMessage,
      });
    } catch (error) {
      setMessages((items) => [...items, { role: "advisor", text: error.message }]);
    } finally { setBusy(false); }
  }

  return <main className="ai004c-page">
    <header className="ai004c-hero"><span><Sparkles size={16}/> ConnectIQ AI Sales Advisor</span><h1>Choose internet with confidence.</h1><p>Address-level availability, conversational guidance, and a quote that builds as we learn what matters to you.</p></header>
    <section className="ai004c-progress"><div><span style={{width:`${progress}%`}}/></div><small>{progress}% toward an order-ready recommendation</small></section>
    <section className="ai004c-grid">
      <aside className="ai004c-panel"><h2><Wifi size={19}/> Available providers</h2>
        {!providers.length ? <form onSubmit={lookup} className="ai004c-address"><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Full service address"/><button disabled={busy}>Check address <ArrowRight size={17}/></button></form> : providers.slice(0,5).map((provider,index)=><article className={`ai004c-provider ${index===0?'is-best':''}`} key={`${providerName(provider)}-${index}`}><div><strong>{providerName(provider)}</strong>{index===0&&<span>Leading option</span>}</div><p>{provider.technology || provider.technologyType || provider.technology_code_type || "Broadband"}</p><small>Up to {provider.maxDownload || provider.maxdown || provider.downloadSpeed || "—"} Mbps</small></article>)}
      </aside>
      <section className="ai004c-panel ai004c-chat"><h2><Bot size={19}/> Your advisor</h2><div className="ai004c-messages">{messages.map((item,index)=><div key={index} className={`ai004c-message ${item.role}`}>{item.text}</div>)}{busy&&<div className="ai004c-message advisor"><LoaderCircle className="ai004c-spin" size={17}/> Reviewing your options…</div>}</div>{suggestedReplies.length>0&&<div className="ai004c-suggestions">{suggestedReplies.map(item=><button key={item} onClick={()=>submitTurn(item)}>{item}</button>)}</div>}<div className="ai004c-compose"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitTurn();}} placeholder="Tell me about your current service…" disabled={busy}/><button onClick={()=>submitTurn()} disabled={busy||!message.trim()}><Send size={18}/></button></div></section>
      <aside className="ai004c-panel ai004c-quote"><h2><CheckCircle2 size={19}/> Quote builder</h2>{quote?.provider?<><div className="ai004c-quote-provider">{quote.provider}</div><dl><div><dt>Technology</dt><dd>{quote.technology || "Confirming"}</dd></div><div><dt>Download</dt><dd>{quote.downloadMbps ? `${quote.downloadMbps} Mbps` : "Confirming"}</dd></div><div><dt>Estimated monthly</dt><dd>{quote.estimatedMonthlyPrice ? `$${quote.estimatedMonthlyPrice}` : "Provider confirmation"}</dd></div><div><dt>Estimated savings</dt><dd>{quote.estimatedMonthlySavings ? `$${quote.estimatedMonthlySavings}/mo` : "—"}</dd></div></dl><p className="ai004c-disclaimer">{quote.disclaimer}</p><button className="ai004c-primary">Continue to order details</button></>:<div className="ai004c-empty"><Sparkles size={28}/><strong>Your quote will build here</strong><p>Share your current provider, monthly bill, and priorities with the advisor.</p></div>}</aside>
    </section>
  </main>;
}
