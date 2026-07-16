import { PROVIDERS } from "../services/providerIntelligence";

export default function CarrierDatabase() {
  return (
    <section>
      <div className="admin-heading">
        <span>Carrier Intelligence</span>
        <h1>Provider Database</h1>
        <p>Internal intelligence used to guide recommendations, advisor talking points, and future commission tracking.</p>
      </div>

      <div className="carrier-grid-v2">
        {PROVIDERS.map((provider) => (
          <div className="carrier-card-v2" key={provider.id}>
            <div className="carrier-card-header">
              <h2>{provider.name}</h2>
              <span>{provider.technology}</span>
            </div>
            <p>{provider.notes}</p>
            <div className="carrier-meta-grid">
              <div><strong>{provider.reliability}</strong><span>Reliability</span></div>
              <div><strong>{provider.latency}</strong><span>Latency</span></div>
              <div><strong>{provider.installEta}</strong><span>Install ETA</span></div>
              <div><strong>${provider.typicalCommission}</strong><span>Est. Commission</span></div>
            </div>
            <div className="fit-tags">
              {provider.customerFit.map((fit) => <span key={fit}>{fit}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
