import { useState } from "react";
import { CheckCircle2, Building2, ShieldCheck, Zap } from "lucide-react";
import { createLead } from "../services/leadService";

export default function BusinessInternet() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    await createLead({
      ...form,
      priority: "Business internet",
      source: "business_page",
      message: form.message,
    });

    setSaving(false);
    setSubmitted(true);
    setForm({ name: "", email: "", phone: "", address: "", message: "" });
  }

  return (
    <section className="public-page business-page">
      <span className="eyebrow">Business connectivity</span>
      <h1>Business Internet Built Around Your Location</h1>
      <p>
        Compare fiber, cable, wireless backup, and business-class internet options with help
        from a ConnectIQ advisor.
      </p>

      <div className="public-grid business-grid">
        <div className="public-card"><Building2 /><h3>Small Business</h3><p>Find reliable service for offices, storefronts, and professional locations.</p></div>
        <div className="public-card"><ShieldCheck /><h3>Reliability Focus</h3><p>Evaluate primary and backup connectivity to reduce downtime risk.</p></div>
        <div className="public-card"><Zap /><h3>Fast Setup</h3><p>Compare providers by speed, install timing, technology, and fit.</p></div>
      </div>

      <div className="lead-panel business-lead-panel">
        <div>
          <span>Need a business quote?</span>
          <h3>Request a business internet review.</h3>
          <p>Send your location and needs. We’ll help identify options and next steps.</p>
        </div>

        {submitted ? (
          <div className="lead-success"><CheckCircle2 /><h3>Request received.</h3><p>A ConnectIQ advisor will follow up.</p></div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email" required />
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" required />
            <input name="address" value={form.address} onChange={handleChange} placeholder="Business address" />
            <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your business needs" />
            <button type="submit" disabled={saving}>{saving ? "Sending..." : "Request Business Help"}</button>
          </form>
        )}
      </div>
    </section>
  );
}
