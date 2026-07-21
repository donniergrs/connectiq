import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Boxes,
  CircleDollarSign,
  Database,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import {
  createProviderCatalogRecord,
  findCatalogMatches,
  listProviderCatalog,
  removeProviderCatalogRecord,
  saveProviderCatalogRecord,
  seedProviderCatalog,
} from "../services/providerCatalogService";

const EMPTY = {
  providerName: "",
  technology: "Fiber",
  active: true,
  serviceNotes: "",
  strengths: [],
  weaknesses: [],
  equipment: "",
  installation: "",
  supportNotes: "",
  commissionValue: 0,
  plans: [],
  promotions: [],
  faqs: [],
};

const lines = (value) => String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
const joinLines = (value) => (value || []).join("\n");

function editable(record = EMPTY) {
  return {
    ...EMPTY,
    ...record,
    strengthsText: joinLines(record.strengths),
    weaknessesText: joinLines(record.weaknesses),
    plansText: (record.plans || []).map((plan) => [plan.name, plan.downloadMbps || 0, plan.uploadMbps || 0, plan.monthlyPrice || 0].join(" | ")).join("\n"),
    promotionsText: (record.promotions || []).map((promo) => [promo.name || "Promotion", promo.description || "", promo.expiresOn || ""].join(" | ")).join("\n"),
    faqsText: (record.faqs || []).map((faq) => `${faq.question} | ${faq.answer}`).join("\n"),
  };
}

function parseForm(form) {
  return {
    ...form,
    commissionValue: Number(form.commissionValue || 0),
    strengths: lines(form.strengthsText),
    weaknesses: lines(form.weaknessesText),
    plans: lines(form.plansText).map((row, index) => {
      const [name, downloadMbps, uploadMbps, monthlyPrice] = row.split("|").map((item) => item.trim());
      return { id: `plan-${Date.now()}-${index}`, name, downloadMbps: Number(downloadMbps || 0), uploadMbps: Number(uploadMbps || 0), monthlyPrice: Number(monthlyPrice || 0), active: true, contract: "Verify" };
    }),
    promotions: lines(form.promotionsText).map((row) => {
      const [name, description, expiresOn] = row.split("|").map((item) => item.trim());
      return { name, description, expiresOn };
    }),
    faqs: lines(form.faqsText).map((row) => {
      const [question, ...answer] = row.split("|").map((item) => item.trim());
      return { question, answer: answer.join(" | ") };
    }),
  };
}

export default function KnowledgeEngine() {
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(editable());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setProviders(await listProviderCatalog());
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load ProviderIQ. Confirm Firestore access and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => findCatalogMatches(providers, search), [providers, search]);
  const totals = useMemo(() => ({
    providers: providers.length,
    plans: providers.reduce((sum, item) => sum + (item.plans?.length || 0), 0),
    promotions: providers.reduce((sum, item) => sum + (item.promotions?.length || 0), 0),
    faqs: providers.reduce((sum, item) => sum + (item.faqs?.length || 0), 0),
  }), [providers]);

  function selectProvider(provider) {
    setSelectedId(provider.id);
    setForm(editable(provider));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newProvider() {
    setSelectedId(null);
    setForm(editable());
    setMessage("");
  }

  async function save() {
    if (!form.providerName.trim()) {
      setError("Provider name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = parseForm(form);
      if (selectedId) await saveProviderCatalogRecord(selectedId, payload);
      else await createProviderCatalogRecord(payload);
      await load();
      newProvider();
      setMessage("Provider knowledge saved successfully.");
    } catch (saveError) {
      console.error(saveError);
      setError("Provider knowledge could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selectedId || !window.confirm(`Delete ${form.providerName}?`)) return;
    try {
      await removeProviderCatalogRecord(selectedId);
      newProvider();
      await load();
      setMessage("Provider removed.");
    } catch (deleteError) {
      console.error(deleteError);
      setError("Provider could not be removed.");
    }
  }

  async function seed() {
    setSaving(true);
    setError("");
    try {
      await seedProviderCatalog();
      await load();
      setMessage("Starter provider catalog loaded. Replace all unverified pricing before customer use.");
    } catch (seedError) {
      console.error(seedError);
      setError("Starter catalog could not be loaded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ai009-page">
      <header className="ai009-hero">
        <div>
          <span className="eyebrow">AI-009 · ConnectIQ Knowledge Engine</span>
          <h1>ProviderIQ Catalog</h1>
          <p>Maintain providers, plans, promotions, equipment, sales notes, and verified answers without changing application code.</p>
        </div>
        <div className="ai009-hero-actions">
          <button type="button" onClick={seed} disabled={saving}><Database size={17}/> Load starter catalog</button>
          <button type="button" className="primary" onClick={newProvider}><Plus size={17}/> Add provider</button>
        </div>
      </header>

      <div className="ai009-stats">
        <div><Wifi/><strong>{totals.providers}</strong><span>Providers</span></div>
        <div><Boxes/><strong>{totals.plans}</strong><span>Plans</span></div>
        <div><CircleDollarSign/><strong>{totals.promotions}</strong><span>Promotions</span></div>
        <div><BookOpenCheck/><strong>{totals.faqs}</strong><span>Knowledge answers</span></div>
      </div>

      {(message || error) && <div className={`ai009-banner ${error ? "error" : "success"}`}>{error || message}</div>}

      <div className="ai009-layout">
        <aside className="ai009-list-panel">
          <div className="ai009-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search providers, plans, or knowledge" /></div>
          <div className="ai009-list-head"><strong>Catalog</strong><button type="button" onClick={load}><RefreshCw size={15}/></button></div>
          {loading ? <p className="ai009-empty">Loading catalog…</p> : filtered.length ? filtered.map((provider) => (
            <button type="button" key={provider.id} className={`ai009-provider-row ${selectedId === provider.id ? "active" : ""}`} onClick={() => selectProvider(provider)}>
              <span className="ai009-tech">{provider.technology || "Unknown"}</span>
              <strong>{provider.providerName}</strong>
              <small>{provider.plans?.length || 0} plans · {provider.promotions?.length || 0} promotions</small>
              <em>{provider.active === false ? "Inactive" : "Active"}</em>
            </button>
          )) : <p className="ai009-empty">No providers found. Load the starter catalog or add one.</p>}
        </aside>

        <main className="ai009-editor">
          <div className="ai009-editor-title">
            <div><span>{selectedId ? "Edit catalog record" : "New catalog record"}</span><h2>{form.providerName || "Provider knowledge"}</h2></div>
            {selectedId && <button type="button" className="danger" onClick={remove}><Trash2 size={16}/> Delete</button>}
          </div>

          <section>
            <h3>Provider profile</h3>
            <div className="ai009-fields two">
              <label>Provider name<input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} /></label>
              <label>Technology<select value={form.technology} onChange={(e) => setForm({ ...form, technology: e.target.value })}>{["Fiber", "Cable", "Fixed Wireless", "DSL", "Satellite", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Internal commission value<input type="number" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: e.target.value })} /></label>
              <label className="ai009-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active in recommendations</label>
            </div>
            <label>Provider overview<textarea rows="4" value={form.serviceNotes} onChange={(e) => setForm({ ...form, serviceNotes: e.target.value })} placeholder="Verified provider summary and service notes" /></label>
          </section>

          <section>
            <h3>Sales intelligence</h3>
            <div className="ai009-fields two">
              <label>Strengths — one per line<textarea rows="5" value={form.strengthsText} onChange={(e) => setForm({ ...form, strengthsText: e.target.value })} /></label>
              <label>Weaknesses / cautions — one per line<textarea rows="5" value={form.weaknessesText} onChange={(e) => setForm({ ...form, weaknessesText: e.target.value })} /></label>
              <label>Equipment notes<textarea rows="4" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} /></label>
              <label>Installation notes<textarea rows="4" value={form.installation} onChange={(e) => setForm({ ...form, installation: e.target.value })} /></label>
            </div>
            <label>Support and advisor notes<textarea rows="3" value={form.supportNotes} onChange={(e) => setForm({ ...form, supportNotes: e.target.value })} /></label>
          </section>

          <section>
            <h3>Plans and pricing</h3>
            <p className="ai009-format">One plan per line: Plan name | Download Mbps | Upload Mbps | Monthly price</p>
            <textarea rows="7" value={form.plansText} onChange={(e) => setForm({ ...form, plansText: e.target.value })} placeholder="Internet 1 Gig | 1000 | 1000 | 79.99" />
          </section>

          <section>
            <h3>Promotions</h3>
            <p className="ai009-format">One promotion per line: Name | Description | Expiration date</p>
            <textarea rows="5" value={form.promotionsText} onChange={(e) => setForm({ ...form, promotionsText: e.target.value })} placeholder="Free installation | Installation fee waived for eligible new customers | 2026-12-31" />
          </section>

          <section>
            <h3>Provider knowledge answers</h3>
            <p className="ai009-format">One answer per line: Question | Verified answer</p>
            <textarea rows="7" value={form.faqsText} onChange={(e) => setForm({ ...form, faqsText: e.target.value })} placeholder="Are upload speeds symmetrical? | Yes on verified fiber plans." />
          </section>

          <div className="ai009-verification"><ShieldCheck size={18}/><p><strong>Verification rule:</strong> Pricing, promotions, fees, availability, and contract details must be verified before they are shown to a customer or placed into QuoteIQ.</p></div>
          <div className="ai009-editor-actions"><button type="button" onClick={newProvider}><X size={16}/> Clear</button><button type="button" className="primary" disabled={saving} onClick={save}><Save size={16}/> {saving ? "Saving…" : "Save provider knowledge"}</button></div>
        </main>
      </div>
    </section>
  );
}
