import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">Internet shopping made simple</span>
          <h1>Find the best internet available at your address.</h1>
          <p>
            Compare fiber, cable, wireless, and business internet options in less
            than 30 seconds. ConnectIQ helps you choose the right provider.
          </p>

          <div className="hero-actions">
            <Link to="/availability" className="primary-cta">
              Check Availability
            </Link>
            <Link to="/contact" className="secondary-cta">
              Talk to an Advisor
            </Link>
          </div>
        </div>
      </section>

      <section className="public-section">
        <h2>Why ConnectIQ?</h2>

        <div className="public-grid">
          <div className="public-card">
            <h3>Compare Providers</h3>
            <p>See available fiber, cable, wireless, and business options.</p>
          </div>

          <div className="public-card">
            <h3>Get a Recommendation</h3>
            <p>We help match your household or business to the right service.</p>
          </div>

          <div className="public-card">
            <h3>We Help You Order</h3>
            <p>ConnectIQ works with you to find and start the right solution.</p>
          </div>
        </div>
      </section>

      <section className="provider-strip">
        <h2>We help compare leading providers</h2>
        <div className="provider-list">
          <span>Lumos</span>
          <span>AT&T</span>
          <span>Spectrum</span>
          <span>T-Mobile</span>
          <span>Verizon</span>
          <span>Brightspeed</span>
        </div>
      </section>

      <section className="final-cta">
        <h2>Ready to find better internet?</h2>
        <Link to="/availability" className="primary-cta">
          Check My Address
        </Link>
      </section>
    </>
  );
}