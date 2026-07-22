import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Loader2, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { lookupProviders } from "../services/fccService";
import { rankProviderOptions } from "../services/brain/revenueOptimizer";

export default function AddressLookup() {
  const [address, setAddress] = useState("");
  const [searchedAddress, setSearchedAddress] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [leadSaved, setLeadSaved] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", phone: "" });

  async function search(event) {
    event.preventDefault();
    if (!address.trim()) return;
    setLoading(true); setError(""); setProviders([]); setLeadSaved(false); setSearchedAddress(address.trim());
    try {
      const result = await lookupProviders(address.trim(), { includeAiResearch: true });
      setProviders(rankProviderOptions(result.providers || [], {}, {}));
      if (!(result.providers || []).length) setError("We could not identify provider candidates. Call or schedule with ConnectIQ and we will verify the address manually.");
    } catch (lookupError) {
      setError(lookupError.message || "We could not complete this search.");
    } finally { setLoading(false); }
  }

  async function submitLead(event) {
    event.preventDefault();
    await addDoc(collection(db, "leads"), {
      ...lead,
      address: searchedAddress,
      providers,
      recommendedProvider: providers[0]?.name || "",
      source: "customer_ai_availability",
      status: "Advisor Follow-up Required",
      verificationRequired: providers.every((provider) => !provider.verified),
      createdAt: serverTimestamp(),
    });
    setLeadSaved(true);
  }

  return <main className="availability-page">
    <section className="availability-hero"><div className="availability-glow" /><div className="availability-inner">
      <div className="hero-badge"><Sparkles size={16}/> ConnectIQ AI broadband advisor</div>
      <h1>See possible internet options for your home.</h1>
      <p>We identify possible providers, compare the options, and connect you with ConnectIQ to confirm availability and place the order.</p>
      <form className="premium-search" onSubmit={search}><input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Enter your complete service address" required/><button disabled={loading}>{loading ? "Researching..." : "Find My Options"} <ArrowRight size={18}/></button></form>
    </div></section>
    {loading && <section className="searching-panel"><Loader2 className="spin"/><h2>ConnectIQ is researching your options...</h2><p>This should take less than 10 seconds.</p></section>}
    {error && <div className="funnel-error">{error}</div>}
    {!loading && providers.length > 0 && <section className="results-experience">
      <div className="results-heading"><span>Possible providers near your address</span><h2>We identified {providers.length} possible options.</h2><p>{searchedAddress}</p><small>Availability is not final until confirmed by ConnectIQ and the selected carrier.</small></div>
      <div className="provider-result-grid">{providers.map((provider, index)=><article className={`provider-result-card ${index === 0 ? "is-recommended" : ""}`} key={provider.id || provider.name}>
        {index===0 && <div className="recommended-badge">Recommended option</div>}
        <div className="provider-mark" aria-hidden="true">{provider.name?.charAt(0) || "I"}</div>
        <h3>{provider.name}</h3>
        <p>{provider.technology || "Internet service"}</p>
        <span>{provider.verified ? "Availability verified" : "Possible option"}</span>
      </article>)}</div>
      <div className="lead-panel"><div><span>Confirm the result and place your order</span><h3>Call ConnectIQ or schedule an advisor appointment.</h3><p>We will verify the final serviceability, review current pricing, and complete your order without sending you to the carrier.</p><div className="hero-actions"><a className="primary-button" href="tel:+18663366737"><Phone size={18}/> Call ConnectIQ</a><a className="ghost-button" href="/contact"><CalendarDays size={18}/> Schedule Appointment</a></div></div>
      {leadSaved ? <div className="lead-success"><CheckCircle2/><h3>Request received.</h3><p>A ConnectIQ advisor will contact you.</p></div> : <form onSubmit={submitLead}><input placeholder="Name" required value={lead.name} onChange={(e)=>setLead({...lead,name:e.target.value})}/><input placeholder="Email" required value={lead.email} onChange={(e)=>setLead({...lead,email:e.target.value})}/><input placeholder="Phone" required value={lead.phone} onChange={(e)=>setLead({...lead,phone:e.target.value})}/><button>Have ConnectIQ Contact Me</button></form>}
      </div><div className="trust-row"><ShieldCheck size={16}/> ConnectIQ confirms availability before an order is submitted.</div>
    </section>}
  </main>;
}
