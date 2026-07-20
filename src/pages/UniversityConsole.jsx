import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export default function UniversityConsole() {
  const [providers, setProviders] = useState([]);
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading University…");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/university/providers`).then((r) => r.json()),
      fetch(`${API}/api/university/articles`).then((r) => r.json()),
    ]).then(([p, a]) => {
      setProviders(p.providers || []);
      setArticles(a.articles || []);
      setStatus("ConnectIQ University is online");
    }).catch((error) => setStatus(`Unable to load University: ${error.message}`));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return providers;
    return providers.filter((p) => `${p.name} ${p.technology?.join(" ")} ${p.services?.join(" ")}`.toLowerCase().includes(needle));
  }, [providers, query]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ opacity: .65, margin: 0 }}>CONNECTIQ ENTERPRISE v2.0 RC1</p>
        <h1 style={{ margin: "6px 0" }}>ConnectIQ University</h1>
        <p>{status}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 24 }}>
        <Metric label="Provider profiles" value={providers.length} />
        <Metric label="Knowledge articles" value={articles.length} />
        <Metric label="Schema" value="v1.0" />
        <Metric label="Grounding" value="Active" />
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search providers, technology, or services" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid #444", background: "transparent", color: "inherit", marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {filtered.map((provider) => (
          <article key={provider.id} style={{ border: "1px solid #333", borderRadius: 14, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>{provider.name}</h3>
            <p><strong>Technology:</strong> {provider.technology.join(", ")}</p>
            <p><strong>Services:</strong> {provider.services.join(", ")}</p>
            <p style={{ opacity: .8 }}>{provider.strengths[0]}</p>
            <small style={{ opacity: .6 }}>Address-level availability and pricing must be verified.</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div style={{ border: "1px solid #333", borderRadius: 12, padding: 16 }}><div style={{ opacity: .65 }}>{label}</div><strong style={{ fontSize: 26 }}>{value}</strong></div>;
}
