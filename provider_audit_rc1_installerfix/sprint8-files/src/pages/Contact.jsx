import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createLead } from "../services/leadService";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createLead({
        ...form,
        priority: "Advisor consultation",
        source: "contact_page",
        message: form.message,
      });
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      setError("We could not submit your request. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="public-page contact-experience">
      <span className="eyebrow">Connect with an advisor</span>
      <h1>Talk to a ConnectIQ Advisor</h1>
      <p>
        Tell us what you need and we’ll help compare providers, avoid confusing offers,
        and choose the best internet solution for your home or business.
      </p>

      {submitted ? (
        <div className="lead-success public-success">
          <CheckCircle2 />
          <h3>Your request was received.</h3>
          <p>A ConnectIQ advisor will follow up with you shortly.</p>
        </div>
      ) : (
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />

          <label>Email</label>
          <input name="email" value={form.email} onChange={handleChange} placeholder="Your email" required />

          <label>Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Your phone number" required />

          <label>Message</label>
          <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us what you need" />

          {error && <div className="funnel-error">{error}</div>}

          <button type="submit" disabled={saving}>{saving ? "Sending..." : "Request Help"}</button>
        </form>
      )}
    </section>
  );
}
