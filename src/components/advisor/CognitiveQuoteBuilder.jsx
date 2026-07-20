import { Brain, CheckCircle2, CircleDashed } from "lucide-react";

function valueAt(twin, domain, key) {
  return twin?.understanding?.[domain]?.[key]?.value;
}

function display(value, formatter = (item) => item) {
  if (value === undefined || value === null || value === "") return "Learning…";
  return formatter(value);
}

export default function CognitiveQuoteBuilder({ twin, readiness }) {
  const rows = [
    ["Current provider", valueAt(twin, "currentService", "currentProvider")],
    ["Monthly bill", valueAt(twin, "budget", "monthlyBill"), (value) => `$${Number(value).toFixed(0)}/month`],
    ["Primary goal", valueAt(twin, "goals", "primaryPriority"), (value) => String(value).replaceAll("_", " ")],
    ["Internet use", valueAt(twin, "usage", "internetUsage")],
    ["Household", valueAt(twin, "household", "householdSize"), (value) => `${value} people`],
    ["Service address", valueAt(twin, "location", "address")],
  ];
  const score = Number(twin?.metrics?.understandingScore || 0);

  return (
    <section className="cxp001-quote-builder" aria-label="Live customer profile">
      <header><Brain size={19} /><div><span>Live Customer Twin</span><strong>Recommendation Builder</strong></div></header>
      <div className="cxp001-readiness"><div><span>Recommendation readiness</span><b>{score}%</b></div><progress max="100" value={score} /></div>
      <div className="cxp001-facts">
        {rows.map(([label, raw, formatter]) => {
          const known = raw !== undefined && raw !== null && raw !== "";
          return <div key={label}>{known ? <CheckCircle2 /> : <CircleDashed />}<span>{label}</span><b>{display(raw, formatter)}</b></div>;
        })}
      </div>
      <p className={readiness?.ready ? "is-ready" : ""}>{readiness?.ready ? "Ready to compare available providers." : "The Advisor is collecting only the information still needed."}</p>
    </section>
  );
}
