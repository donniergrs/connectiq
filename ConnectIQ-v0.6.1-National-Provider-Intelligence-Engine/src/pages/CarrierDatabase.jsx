import { PROVIDER_INTELLIGENCE, formatCurrency } from "../services/providerIntelligence";

export default function CarrierDatabase() {
  const providers = Object.values(PROVIDER_INTELLIGENCE);

  return (
    <section className="sprint9-page">
      <div className="sprint9-hero-card compact">
        <div>
          <span className="eyebrow">Carrier Intelligence</span>
          <h1>Provider Database</h1>
          <p>Internal advisor reference for provider strengths, estimated commissions, installation expectations, and recommendations.</p>
        </div>
      </div>

      <div className="carrier-intelligence-list">
        {providers.map((provider) => (
          <div className="carrier-profile-card" key={provider.id}>
            <div>
              <span className="eyebrow">{provider.technology}</span>
              <h2>{provider.name}</h2>
              <p>{provider.promo}</p>
            </div>

            <div className="carrier-profile-stats">
              <div><strong>{provider.reliability}%</strong><span>Reliability</span></div>
              <div><strong>{provider.latencyMs}ms</strong><span>Latency</span></div>
              <div><strong>{provider.installEta}</strong><span>Install ETA</span></div>
              <div><strong>{formatCurrency(provider.commission)}</strong><span>Commission</span></div>
            </div>

            <div className="carrier-strengths">
              {provider.strengths.map((strength) => <span key={strength}>{strength}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
