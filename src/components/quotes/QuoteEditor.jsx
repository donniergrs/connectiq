import { useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Mail, Send, X } from "lucide-react";
import { createManualQuote, buildQuoteEmail } from "../../services/quoteIQService";

const money = (value) => value === "" || value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
const isoDate = (days=14) => { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };

export default function QuoteEditor({ lead, workspace, onClose, onSaved }) {
  const rec = workspace?.recommendation || {};
  const household = workspace?.household || {};
  const customer = workspace?.customer || {};
  const [form,setForm]=useState({
    provider: rec.provider === "Not captured" ? "" : rec.provider || lead.recommendedProvider || "",
    plan: rec.plan === "Not captured" ? "" : rec.plan || "",
    technology: rec.technology || "",
    download: rec.download || "",
    upload: rec.upload || "",
    monthlyPrice: rec.monthlyPrice || "",
    promotion: "",
    equipmentFee: 0,
    installationFee: 0,
    contract: "No annual contract verified",
    expirationDate: isoDate(14),
    advisorNotes: "",
    reasons: (rec.reasons || []).join("\n") || `You want a better fit than ${household.currentProvider || "your current provider"}.\nThis option is intended to support ${household.priority || "your household priorities"}.`,
  });
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(null); const [error,setError]=useState("");
  const set=(key)=>(e)=>setForm(v=>({...v,[key]:e.target.value}));
  const savings=useMemo(()=>{ const current=Number(lead.monthlyBill||lead.currentMonthlyBill||household.currentBill||0); const proposed=Number(form.monthlyPrice||0)+Number(form.equipmentFee||0); return current&&proposed ? current-proposed : null; },[lead,household,form]);

  async function saveQuote(){
    if(!form.provider||!form.plan||!form.monthlyPrice){ setError("Provider, plan, and monthly price are required."); return; }
    setSaving(true); setError("");
    try{
      const quote=await createManualQuote({ lead, workspace, form, savings });
      setSaved(quote); onSaved?.(quote);
    }catch(e){ setError(e.message||"Unable to save quote."); }finally{ setSaving(false); }
  }
  async function copyLink(){ if(saved?.publicUrl) await navigator.clipboard.writeText(saved.publicUrl); }
  function emailQuote(){ if(!saved) return; const email=buildQuoteEmail(saved); window.location.href=`mailto:${encodeURIComponent(saved.customer.email||"")}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`; }

  return <div className="quoteiq-modal-backdrop" role="presentation">
    <div className="quoteiq-modal" role="dialog" aria-modal="true" aria-label="Create customer quote">
      <header><div><span className="eyebrow">QuoteIQ v1.0</span><h2>Your Personalized Internet Recommendation</h2><p>Review all pricing before sending. QuoteIQ will not guess unverified values.</p></div><button className="quoteiq-icon" onClick={onClose}><X/></button></header>
      {!saved ? <div className="quoteiq-editor-grid">
        <div className="quoteiq-form">
          <div className="quoteiq-section-title">Recommended service</div>
          <div className="quoteiq-fields two"><label>Provider<input value={form.provider} onChange={set("provider")}/></label><label>Plan<input value={form.plan} onChange={set("plan")}/></label></div>
          <div className="quoteiq-fields three"><label>Technology<input value={form.technology} onChange={set("technology")}/></label><label>Download Mbps<input type="number" value={form.download} onChange={set("download")}/></label><label>Upload Mbps<input type="number" value={form.upload} onChange={set("upload")}/></label></div>
          <div className="quoteiq-fields three"><label>Monthly price<input type="number" step="0.01" value={form.monthlyPrice} onChange={set("monthlyPrice")}/></label><label>Equipment fee<input type="number" step="0.01" value={form.equipmentFee} onChange={set("equipmentFee")}/></label><label>Installation fee<input type="number" step="0.01" value={form.installationFee} onChange={set("installationFee")}/></label></div>
          <label>Promotion<input value={form.promotion} onChange={set("promotion")} placeholder="Example: Price guaranteed for 12 months"/></label>
          <div className="quoteiq-fields two"><label>Contract details<input value={form.contract} onChange={set("contract")}/></label><label>Quote expires<input type="date" value={form.expirationDate} onChange={set("expirationDate")}/></label></div>
          <label>Why we recommend this<textarea rows="4" value={form.reasons} onChange={set("reasons")} /></label>
          <label>Advisor notes<textarea rows="3" value={form.advisorNotes} onChange={set("advisorNotes")} placeholder="Optional message for the customer"/></label>
          {error&&<p className="quoteiq-error">{error}</p>}
          <button className="quoteiq-primary" onClick={saveQuote} disabled={saving}><Send size={17}/>{saving?"Saving…":"Create Quote"}</button>
        </div>
        <QuotePreview lead={lead} customer={customer} household={household} form={form} savings={savings}/>
      </div> : <div className="quoteiq-success">
        <CheckCircle2 size={54}/><h3>Quote {saved.quoteNumber} is ready</h3><p>The quote was saved to the lead and the customer link is ready to send.</p>
        <div className="quoteiq-success-actions"><button className="quoteiq-primary" onClick={emailQuote}><Mail size={17}/>Open Customer Email</button><button onClick={copyLink}><Copy size={17}/>Copy Quote Link</button><a href={saved.publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Preview Customer Quote</a></div>
        <small>Email delivery remains advisor-controlled in v1.0. The button opens your email client with the message and quote link prepared.</small>
      </div>}
    </div>
  </div>;
}

function QuotePreview({lead,customer,household,form,savings}){
  return <aside className="quoteiq-preview"><div className="quoteiq-brand">Connect<span>IQ</span></div><span className="quoteiq-kicker">Your Personalized Internet Recommendation</span><h3>{customer.name||lead.name||"Customer"}</h3><p>{customer.address||lead.address}</p>
    <div className="quoteiq-preview-card"><small>Recommended service</small><strong>{form.provider||"Provider"}</strong><span>{form.plan||"Plan"}</span><b>{money(form.monthlyPrice)}<em>/month</em></b><p>{form.download||"—"} Mbps down · {form.upload||"—"} Mbps up</p></div>
    <div className="quoteiq-why"><strong>Why this fits</strong>{form.reasons.split("\n").filter(Boolean).map((x,i)=><p key={i}>✓ {x}</p>)}</div>
    <div className="quoteiq-compare"><div><span>Current provider</span><strong>{household.currentProvider||lead.currentProvider||"Not captured"}</strong></div><div><span>Estimated savings</span><strong>{savings>0?`${money(savings)}/mo`:"Review pricing"}</strong></div></div>
    <button type="button" className="quoteiq-cta-preview">Click Here to Order</button><small>Pricing, promotions, availability, taxes, fees, and installation details must be verified before ordering.</small>
  </aside>
}
