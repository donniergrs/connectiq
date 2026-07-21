import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCopy, PackageCheck, Save, ShieldAlert, X } from "lucide-react";
import { buildDsiOrderSummary, buildOrderDraft, evaluateOrderReadiness, findLatestQuoteForLead, saveOrderIQ } from "../../services/orderIQService";

const field = (setForm, key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

export default function OrderIQWorkspace({ lead, workspace, onClose }) {
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState(() => buildOrderDraft({ lead, workspace }));
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    findLatestQuoteForLead(lead.id, lead.quoteId)
      .then((result) => {
        if (!active) return;
        setQuote(result);
        setForm(buildOrderDraft({ lead, workspace, quote: result }));
      })
      .catch((err) => { if (active) setError(err.message || "QuoteIQ handoff could not be loaded."); })
      .finally(() => { if (active) setLoadingQuote(false); });
    return () => { active = false; };
  }, [lead, workspace]);

  const readiness = useMemo(() => evaluateOrderReadiness(form), [form]);
  const summary = useMemo(() => buildDsiOrderSummary(form, readiness), [form, readiness]);

  async function save() {
    setSaving(true); setError("");
    try {
      const result = await saveOrderIQ({ leadId: lead.id, order: form, readiness });
      setForm((current) => ({ ...current, id: result.orderId, status: result.status }));
      setSaved(result);
    } catch (err) {
      setError(err.message || "OrderIQ could not save this order.");
    } finally { setSaving(false); }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  return <div className="orderiq-backdrop" role="presentation">
    <section className="orderiq-modal" role="dialog" aria-modal="true" aria-label="OrderIQ order workspace">
      <header className="orderiq-header"><div><span className="eyebrow">AI-008 · OrderIQ</span><h2>Prepare DSI-ready order</h2><p>Verify every field before manual submission. OrderIQ does not submit to DSI.</p></div><button onClick={onClose} aria-label="Close OrderIQ"><X /></button></header>
      <div className="orderiq-readiness"><div className="orderiq-score"><strong>{readiness.score}%</strong><span>order readiness</span></div><div><h3>{readiness.ready ? "Ready to submit" : "Complete the missing information"}</h3><p>{readiness.ready ? "All required fields are complete." : `${readiness.missing.length} required field${readiness.missing.length === 1 ? " is" : "s are"} missing.`}</p></div><div className={readiness.ready ? "orderiq-state ready" : "orderiq-state incomplete"}>{readiness.ready ? <CheckCircle2 /> : <ShieldAlert />}{readiness.ready ? "Ready" : "Draft"}</div></div>
      <div className="orderiq-grid">
        <div className="orderiq-form">
          <section><h3>Customer and consent</h3><div className="orderiq-fields two"><label>Customer name<input value={form.customerName} onChange={field(setForm,"customerName")}/></label><label>Phone<input value={form.phone} onChange={field(setForm,"phone")}/></label></div><div className="orderiq-fields two"><label>Email<input value={form.email} onChange={field(setForm,"email")}/></label><label>Contact preference<select value={form.contactPreference} onChange={field(setForm,"contactPreference")}><option value="">Select</option><option>Phone</option><option>Email</option><option>Text</option></select></label></div><label>Service address<input value={form.serviceAddress} onChange={field(setForm,"serviceAddress")}/></label><div className="orderiq-fields two"><label>Preferred contact time<input value={form.preferredContactTime} onChange={field(setForm,"preferredContactTime")} placeholder="Example: Weekdays after 5 PM"/></label><label className="orderiq-check"><input type="checkbox" checked={form.consentConfirmed} onChange={field(setForm,"consentConfirmed")}/><span>Customer consent confirmed</span></label></div></section>
          <section><h3>Selected service</h3><div className="orderiq-handoff">{loadingQuote ? "Loading QuoteIQ selection…" : quote ? `QuoteIQ handoff: ${quote.quoteNumber || quote.quoteId}` : "No saved quote found; verify entries manually."}</div><div className="orderiq-fields two"><label>Provider<input value={form.provider} onChange={field(setForm,"provider")}/></label><label>Plan<input value={form.plan} onChange={field(setForm,"plan")}/></label></div><div className="orderiq-fields three"><label>Technology<input value={form.technology} onChange={field(setForm,"technology")}/></label><label>Download Mbps<input type="number" value={form.download} onChange={field(setForm,"download")}/></label><label>Upload Mbps<input type="number" value={form.upload} onChange={field(setForm,"upload")}/></label></div><div className="orderiq-fields three"><label>Monthly price<input type="number" step="0.01" value={form.monthlyPrice} onChange={field(setForm,"monthlyPrice")}/></label><label>Equipment fee<input type="number" step="0.01" value={form.equipmentFee} onChange={field(setForm,"equipmentFee")}/></label><label>Installation fee<input type="number" step="0.01" value={form.installationFee} onChange={field(setForm,"installationFee")}/></label></div><label>Equipment<input value={form.equipment} onChange={field(setForm,"equipment")}/></label><label>Promotion<input value={form.promotion} onChange={field(setForm,"promotion")}/></label><div className="orderiq-fields two"><label>Contract details<input value={form.contract} onChange={field(setForm,"contract")}/></label><label>Installation preference<input value={form.installationPreference} onChange={field(setForm,"installationPreference")}/></label></div></section>
          <section><h3>Advisor controls</h3><div className="orderiq-fields two"><label>Expected commission<input type="number" step="0.01" value={form.expectedCommission} onChange={field(setForm,"expectedCommission")}/></label><label>Override reason<select value={form.advisorOverrideReason} onChange={field(setForm,"advisorOverrideReason")}><option value="">No override</option><option>Customer preference</option><option>Better promotion</option><option>Better commission</option><option>Availability issue</option><option>Installation timing</option><option>Other</option></select></label></div><label>Special instructions<textarea rows="3" value={form.specialInstructions} onChange={field(setForm,"specialInstructions")}/></label></section>
          {error && <p className="orderiq-error">{error}</p>}
          <div className="orderiq-actions"><button className="orderiq-primary" onClick={save} disabled={saving}><Save size={17}/>{saving ? "Saving…" : readiness.ready ? "Save Ready Order" : "Save Draft"}</button><button onClick={copySummary}><ClipboardCopy size={17}/>{copied ? "Copied" : "Copy DSI Summary"}</button></div>
          {saved && <p className="orderiq-saved"><CheckCircle2 size={16}/>Order {saved.status.toLowerCase()} and linked to this lead.</p>}
        </div>
        <aside className="orderiq-review"><div className="orderiq-review-title"><PackageCheck/><div><span>Submission checklist</span><h3>DSI order package</h3></div></div>{readiness.missing.length ? <div className="orderiq-missing"><strong>Required before submission</strong>{readiness.missing.map((item)=><p key={item}>• {item}</p>)}</div> : <div className="orderiq-complete"><CheckCircle2/><p>All required order fields are complete.</p></div>}{readiness.optional.length > 0 && <div className="orderiq-optional"><strong>Recommended verification</strong>{readiness.optional.map((item)=><p key={item}>• {item}</p>)}</div>}<pre>{summary}</pre></aside>
      </div>
    </section>
  </div>;
}
