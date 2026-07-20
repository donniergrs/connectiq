import crypto from "node:crypto";
import { createEmptyTwin, normalizeFact } from "./schema.js";
import { calculateUnderstandingMetrics, determineRecommendationReadiness } from "./scoring.js";
import { CustomerTwinRepository } from "./repository.js";

function eventId() {
  return `twin-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function mergeUnique(values = [], next = null) {
  return [...new Set([...values, ...(next ? [next] : [])])];
}

export class CustomerTwinService {
  constructor({ db = null, clock = () => new Date().toISOString() } = {}) {
    this.repository = new CustomerTwinRepository(db);
    this.clock = clock;
  }

  async create({ customerId, sessionId = null, channel = "web" }) {
    if (!customerId) throw new Error("customerId is required.");
    const existing = await this.repository.get(customerId);
    if (existing) return existing;

    const now = this.clock();
    const twin = createEmptyTwin({ customerId, sessionId, channel, now });
    await this.repository.save(twin);
    await this.repository.appendEvent(customerId, {
      id: eventId(),
      type: "TWIN_CREATED",
      customerId,
      version: twin.version,
      changes: [],
      recordedAt: now,
    });
    return twin;
  }

  async get(customerId) {
    if (!customerId) throw new Error("customerId is required.");
    return this.repository.get(customerId);
  }

  async updateFacts({ customerId, sessionId = null, channel = "web", facts = [], actor = "cce" }) {
    let twin = await this.repository.get(customerId);
    if (!twin) twin = await this.create({ customerId, sessionId, channel });

    const now = this.clock();
    const changes = [];

    for (const input of facts) {
      const domain = String(input.domain || "").trim();
      const fact = normalizeFact(input, now);
      if (!domain || !fact.key) continue;

      twin.understanding[domain] ||= {};
      const previous = twin.understanding[domain][fact.key] || null;

      const shouldReplace =
        !previous ||
        fact.source === "verified" ||
        fact.source === "explicit" ||
        Number(fact.confidence) >= Number(previous.confidence || 0);

      if (!shouldReplace) continue;

      twin.understanding[domain][fact.key] = {
        ...fact,
        version: Number(previous?.version || 0) + 1,
      };

      changes.push({
        domain,
        key: fact.key,
        previous,
        current: twin.understanding[domain][fact.key],
      });
    }

    twin.channels = mergeUnique(twin.channels, channel);
    twin.sessionIds = mergeUnique(twin.sessionIds, sessionId);
    twin.version = Number(twin.version || 0) + 1;
    twin.updatedAt = now;
    twin.metrics = calculateUnderstandingMetrics(twin);

    const readiness = determineRecommendationReadiness(twin);
    twin.recommendation = {
      ...twin.recommendation,
      readiness: readiness.status,
    };

    await this.repository.save(twin);
    await this.repository.appendEvent(customerId, {
      id: eventId(),
      type: "FACTS_UPDATED",
      customerId,
      actor,
      channel,
      sessionId,
      version: twin.version,
      changes,
      recommendationReadiness: readiness,
      recordedAt: now,
    });

    return { twin, changes, readiness };
  }

  async history(customerId, limit = 100) {
    return this.repository.history(customerId, limit);
  }
}
