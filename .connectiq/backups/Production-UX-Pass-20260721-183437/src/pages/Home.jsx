import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Wifi, Headphones } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="premium-home">
      <section className="premium-hero">
        <div className="hero-glow" />

        <motion.div
          className="hero-inner"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="hero-badge">
            <Sparkles size={16} />
            Internet shopping, intelligently simplified.
          </div>

          <h1>
            Find the best internet option for your household.
          </h1>

          <p>
            ConnectIQ researches possible providers, compares the options, and helps you confirm and order the right service without sending you to a carrier.
          </p>

          <div className="hero-actions">
            <Link to="/availability" className="primary-button">
              Check Availability <ArrowRight size={18} />
            </Link>

            <Link to="/contact" className="ghost-button">
              Talk to an Advisor
            </Link>
          </div>

          <div className="trust-row">
            <span>Fiber</span>
            <span>Cable</span>
            <span>Wireless</span>
            <span>Business</span>
          </div>
        </motion.div>
      </section>

      <section className="value-section">
        <div className="section-heading">
          <span>Why ConnectIQ</span>
          <h2>A smarter way to choose internet.</h2>
        </div>

        <div className="value-grid">
          <div className="value-card">
            <Wifi />
            <h3>Research Possible Options</h3>
            <p>See likely providers and technologies, then confirm final availability with ConnectIQ.</p>
          </div>

          <div className="value-card">
            <ShieldCheck />
            <h3>Get a Real Recommendation</h3>
            <p>We help match your home or business to the right internet solution.</p>
          </div>

          <div className="value-card">
            <Headphones />
            <h3>We Help You Order</h3>
            <p>Call or schedule with ConnectIQ to verify availability and complete the order.</p>
          </div>
        </div>
      </section>

      <section className="provider-section">
        <h2>Compare leading internet providers.</h2>
        <div className="provider-pills">
          <span>Lumos</span>
          <span>AT&T</span>
          <span>Spectrum</span>
          <span>T-Mobile</span>
          <span>Verizon</span>
          <span>Brightspeed</span>
          <span>Kinetic</span>
          <span>Google Fiber</span>
        </div>
      </section>

      <section className="launch-cta">
        <h2>Ready to find better internet?</h2>
        <p>Check your address and let ConnectIQ help you choose with confidence.</p>
        <Link to="/availability" className="primary-button">
          Start Now <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="premium-footer">
        <strong>ConnectIQ</strong>
        <span>Helping customers find the right internet solution.</span>
      </footer>
    </main>
  );
}
