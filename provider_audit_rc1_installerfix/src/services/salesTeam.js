function clean(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export const TEAM_ROLES = ["Administrator", "Sales Manager", "Sales Advisor", "Read Only"];

export function normalizeAdvisor(record = {}) {
  return {
    id: clean(record.id || record.uid),
    uid: clean(record.uid || record.id),
    name: clean(record.name || record.displayName || record.email, "Unnamed Advisor"),
    email: clean(record.email),
    role: TEAM_ROLES.includes(record.role) ? record.role : "Sales Advisor",
    active: record.active !== false,
    capacity: Math.max(0, Number(record.capacity || 0)),
    team: clean(record.team, "Sales"),
  };
}

export function activeAdvisors(records = []) {
  return records.map(normalizeAdvisor).filter((advisor) => advisor.active).sort((a, b) => a.name.localeCompare(b.name));
}

export function advisorAssignment(advisor, assignedBy, assignedAt = new Date()) {
  if (!advisor) return null;
  const normalized = normalizeAdvisor(advisor);
  return {
    uid: normalized.uid || normalized.id,
    name: normalized.name,
    email: normalized.email,
    role: normalized.role,
    assignedAt: assignedAt instanceof Date ? assignedAt.toISOString() : new Date(assignedAt).toISOString(),
    assignedBy: {
      uid: clean(assignedBy?.uid, "unknown-advisor"),
      name: clean(assignedBy?.displayName || assignedBy?.email, "Unknown Advisor"),
      email: clean(assignedBy?.email),
    },
  };
}
