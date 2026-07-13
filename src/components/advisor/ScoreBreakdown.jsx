export default function ScoreBreakdown({ breakdown }) {
  const rows = [
    ["Reliability", breakdown.reliability, 30],
    ["Download speed", breakdown.speed, 25],
    ["Upload fit", breakdown.uploadFit, 20],
    ["Household fit", breakdown.householdFit, 15],
    ["Value", breakdown.value, 10],
  ];
  return <div className="v040-score-breakdown">{rows.map(([label, score, max]) => <div key={label}><span>{label}</span><div><i style={{ width: `${(score / max) * 100}%` }} /></div><strong>{score}/{max}</strong></div>)}</div>;
}
