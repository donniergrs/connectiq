import { Bug, ChevronDown } from "lucide-react";

function formatFact(fact) {
  return `${fact.domain}.${fact.key}: ${Array.isArray(fact.value) ? fact.value.join(", ") : String(fact.value)}`;
}

export default function BrainDebugPanel({ result }) {
  if (!result) return null;
  const analysis = result.analysis || {};
  return (
    <details className="cxp001-debug-panel">
      <summary><Bug size={16} /><span>Brain Debug Panel</span><ChevronDown size={16} /></summary>
      <div className="cxp001-debug-grid">
        <section><span>Intent</span><b>{analysis.intent?.primary || "UNKNOWN"}</b><small>{Math.round(Number(analysis.intent?.confidence || 0) * 100)}% confidence</small></section>
        <section><span>Understanding</span><b>{Math.round(Number(analysis.understandingConfidence || 0) * 100)}%</b><small>{analysis.sentiment?.label || "neutral"} sentiment</small></section>
        <section><span>Twin version</span><b>{result.twin?.version || 0}</b><small>{result.changes?.length || 0} changes this turn</small></section>
        <section><span>Readiness</span><b>{result.readiness?.status || "NOT_READY"}</b><small>{result.readiness?.missing?.length || 0} required facts missing</small></section>
      </div>
      <div className="cxp001-debug-block"><span>Extracted facts</span>{analysis.facts?.length ? analysis.facts.map((fact, index) => <code key={`${fact.domain}-${fact.key}-${index}`}>{formatFact(fact)}</code>) : <code>No facts extracted</code>}</div>
      <div className="cxp001-debug-block"><span>Next best question</span><p>{result.nextBestQuestion?.question || "None"}</p></div>
    </details>
  );
}
