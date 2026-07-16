export default function ScoreBreakdown({ breakdown }) {
  const rows = [
    ["Reliability", breakdown.reliability, 25],
    ["Download speed", breakdown.speed, 20],
    ["Upload fit", breakdown.uploadFit, 15],
    ["Household fit", breakdown.householdFit, 15],
    ["Priority fit", breakdown.priorityFit, 15],
    ["Value", breakdown.value, 10],
  ];

  return (
    <div className="v040-score-breakdown">
      {rows.map(([label, score, max]) => (
        <div key={label}>
          <span>{label}</span>
          <div><i style={{ width: `${Math.min(100, (score / max) * 100)}%` }} /></div>
          <strong>{score}/{max}</strong>
        </div>
      ))}
    </div>
  );
}
