import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowLeft, Gauge, MapPinned, RefreshCw, Save, Shuffle, SlidersHorizontal, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";

const defaults = {
  defaultMethod: "round_robin",
  respectCapacity: true,
  includeUnassignedOnly: true,
  territoryFoundationEnabled: false,
};

export default function DistributionRules() {
  const [rules, setRules] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => onSnapshot(doc(db, "settings", "leadDistribution"), (snapshot) => {
    setRules({ ...defaults, ...(snapshot.exists() ? snapshot.data() : {}) });
    setLoading(false);
  }, () => setLoading(false)), []);

  async function saveRules() {
    setSaving(true);
    setMessage("");
    try {
      await setDoc(doc(db, "settings", "leadDistribution"), {
        ...rules,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || auth.currentUser?.uid || "administrator",
      }, { merge: true });
      setMessage("Distribution rules saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="distribution-rules-state"><RefreshCw className="is-spinning" /> Loading distribution rules…</section>;

  return <section className="distribution-rules-page">
    <header>
      <div><span><SlidersHorizontal size={15}/> Sales Operations</span><h1>Lead Distribution Rules</h1><p>Choose the default routing behavior used when managers distribute unassigned leads.</p></div>
      <Link to="/admin/pipeline"><ArrowLeft size={15}/> Back to pipeline</Link>
    </header>
    <div className="distribution-rule-grid">
      <article><Shuffle/><div><h2>Default assignment method</h2><p>Choose how the distribution toolbar routes selected or unassigned leads.</p><select value={rules.defaultMethod} onChange={(e)=>setRules({...rules,defaultMethod:e.target.value})}><option value="round_robin">Round robin</option><option value="capacity_aware">Capacity balanced</option></select></div></article>
      <article><Gauge/><div><h2>Respect advisor capacity</h2><p>Prevent automatic distribution from overloading advisors with a configured lead limit.</p><label><input type="checkbox" checked={rules.respectCapacity} onChange={(e)=>setRules({...rules,respectCapacity:e.target.checked})}/> Enforce capacity limits</label></div></article>
      <article><UsersRound/><div><h2>Unassigned queue behavior</h2><p>Limit automatic distribution to leads that do not already have an owner.</p><label><input type="checkbox" checked={rules.includeUnassignedOnly} onChange={(e)=>setRules({...rules,includeUnassignedOnly:e.target.checked})}/> Distribute unassigned leads only</label></div></article>
      <article><MapPinned/><div><h2>Territory routing foundation</h2><p>Reserve territory-aware routing for RC3 while preserving the setting in the data model.</p><label><input type="checkbox" checked={rules.territoryFoundationEnabled} onChange={(e)=>setRules({...rules,territoryFoundationEnabled:e.target.checked})}/> Enable territory foundation</label></div></article>
    </div>
    <footer><button onClick={saveRules} disabled={saving}><Save size={15}/>{saving ? "Saving…" : "Save rules"}</button>{message && <span>{message}</span>}</footer>
  </section>;
}
