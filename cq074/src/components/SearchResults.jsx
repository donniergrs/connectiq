export default function SearchResults({ results }) {
  console.log("Search results:", results);

  if (!results || results.length === 0) {
    return (
      <div className="loading-box">
        No providers found.
      </div>
    );
  }

  return (
    <div className="results-grid">
      {results.map((provider) => (
        <div className="card" key={provider.id}>
          <h3>{provider.name}</h3>
          <p>{provider.technology}</p>
          <strong>{provider.download} Mbps Down</strong>
          <span>{provider.upload} Mbps Up</span>
        </div>
      ))}
    </div>
  );
}