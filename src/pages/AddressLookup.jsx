import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { lookupProviders } from "../services/fccService";
import { saveLookup } from "../services/firestoreService";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function AddressLookup() {
  const [address, setAddress] = useState("");
  const [results, setResults] = useState([]);
  const [searchedAddress, setSearchedAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);
  const [error, setError] = useState("");
  const [lead, setLead] = useState({
    name: "",
    email: "",
    phone: "",
    priority: "Fastest speed",
  });

  const recommended = results[0];

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setLeadSaved(false);
    setResults([]);
    setSearchedAddress(address);

    try {
      const providers = await lookupProviders({
        street: address,
        city: "",
        state: "",
        zip: "",
      });

      setResults(providers);
      saveLookup({ address: { full: address }, providers, user: null }).catch(() => {});
    } catch (err) {
      console.error(err);
      setError("We couldn't complete the search. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLeadChange(e) {
    setLead({ ...lead, [e.target.name]: e.target.value });
  }

  async function handleLeadSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await addDoc(collection(db, "leads"), {
        ...lead,
        address: searchedAddress,
        providers: results,
        recommendedProvider: recommended?.name || "",
        source: "public_availability_page",
        status: "New Lead",
        createdAt: serverTimestamp(),
      });

      setLeadSaved(true);
      setLead({ name: "", email: "", phone: "", priority: "Fastest speed" });
    } catch (err) {
      console.error(err);
      setError("We found your options, but could not save your request. Please try again.");
    }
  }

  return (
    <main className="availability-page">
      <section className="availability-hero">
        <div className="availability-glow" />

        <div className="availability-inner">
          <div className="hero-badge">
            <Sparkles size={16} />
            Powered by ConnectIQ intelligence
          </div>

          <h1>Check internet availability at your address.</h1>
          <p>
            Enter your address and ConnectIQ will compare available options,
            recommend the best fit, and help you get connected.
          </p>

          <form className="premium-search" onSubmit={handleSearch}>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your street address"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Check Availability"} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>

      {loading && (
        <section className="searching-panel">
          <Loader2 className="spin" />
          <h2>Building your recommendation...</h2>
          <div className="search-steps">
            <span><CheckCircle2 /> Validating address</span>
            <span><CheckCircle2 /> Finding providers</span>
            <span><CheckCircle2 /> Comparing technologies</span>
            <span><CheckCircle2 /> Preparing recommendation</span>
          </div>
        </section>
      )}

      {error && <div className="funnel-error">{error}</div>}

      {!loading && results.length > 0 && (
        <section className="results-experience">
          <div className="results-heading">
            <span>Available at your address</span>
            <h2>We found {results.length} internet options.</h2>
            <p>{searchedAddress}</p>
          </div>

          <div className="recommendation-card">
            <div className="recommended-badge">ConnectIQ Recommended</div>
            <div>
              <h3>{recommended.name}</h3>
              <p>{recommended.technology} internet built for speed, reliability, and everyday use.</p>
            </div>

            <div className="speed-grid">
              <div>
                <strong>{recommended.download}</strong>
                <span>Mbps down</span>
              </div>
              <div>
                <strong>{recommended.upload}</strong>
                <span>Mbps up</span>
              </div>
            </div>

            <ul>
              <li><Zap /> Strong choice for remote work, streaming, and gaming</li>
              <li><ShieldCheck /> Recommended based on available speed and technology</li>
              <li><CheckCircle2 /> ConnectIQ can help you choose and order service</li>
            </ul>
          </div>

          <div className="provider-comparison">
            <h3>Other available options</h3>
            <div className="provider-result-grid">
              {results.slice(1).map((provider) => (
                <div className="provider-result-card" key={provider.id}>
                  <h4>{provider.name}</h4>
                  <p>{provider.technology}</p>
                  <span>{provider.download} Mbps down / {provider.upload} Mbps up</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lead-panel">
            <div>
              <span>Need help deciding?</span>
              <h3>Talk with a ConnectIQ Advisor.</h3>
              <p>
                Send us your information and we’ll help you compare options,
                avoid confusion, and choose the best solution.
              </p>
            </div>

            {leadSaved ? (
              <div className="lead-success">
                <CheckCircle2 />
                <h3>Your request was received.</h3>
                <p>A ConnectIQ advisor will follow up with you.</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit}>
                <input name="name" value={lead.name} onChange={handleLeadChange} placeholder="Name" required />
                <input name="email" value={lead.email} onChange={handleLeadChange} placeholder="Email" required />
                <input name="phone" value={lead.phone} onChange={handleLeadChange} placeholder="Phone" required />
                <select name="priority" value={lead.priority} onChange={handleLeadChange}>
                  <option>Fastest speed</option>
                  <option>Lowest price</option>
                  <option>Best reliability</option>
                  <option>Work from home</option>
                  <option>Gaming and streaming</option>
                  <option>Business internet</option>
                </select>
                <button type="submit">Get My Recommendation</button>
              </form>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
