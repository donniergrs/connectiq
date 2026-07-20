export function detectContradictions(twin, facts = []) {
  const contradictions = [];
  for (const fact of facts) {
    const existing = twin?.understanding?.[fact.domain]?.[fact.key];
    if (!existing || existing.value === undefined) continue;
    if (JSON.stringify(existing.value) === JSON.stringify(fact.value)) continue;
    contradictions.push({
      domain: fact.domain,
      key: fact.key,
      existingValue: existing.value,
      newValue: fact.value,
      existingConfidence: existing.confidence,
      newConfidence: fact.confidence,
      resolution: Number(fact.confidence || 0) >= Number(existing.confidence || 0)
        ? "accept_new"
        : "retain_existing",
    });
  }
  return contradictions;
}
