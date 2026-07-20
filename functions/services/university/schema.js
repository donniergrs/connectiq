export const KNOWLEDGE_SCHEMA_VERSION = "1.0.0";

export function validateKnowledgeRecord(record = {}) {
  const errors = [];
  if (!record.id) errors.push("id is required");
  if (!record.type) errors.push("type is required");
  if (!record.title) errors.push("title is required");
  if (!Array.isArray(record.tags)) errors.push("tags must be an array");
  if (!record.content || typeof record.content !== "object") errors.push("content must be an object");
  return { valid: errors.length === 0, errors };
}

export function normalizeKnowledgeRecord(record = {}) {
  return {
    id: String(record.id || "").trim(),
    type: String(record.type || "article").trim(),
    title: String(record.title || "").trim(),
    tags: [...new Set((record.tags || []).map((tag) => String(tag).toLowerCase().trim()).filter(Boolean))],
    providerId: record.providerId ? String(record.providerId).toLowerCase().trim() : null,
    content: record.content || {},
    source: record.source || { authority: "ConnectIQ University", verifiedAt: null },
    status: record.status || "active",
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
  };
}
