import crypto from "node:crypto";
import { SEMANTIC_ENGINE_VERSION } from "./constants.js";
import { normalizeText } from "./normalization.js";
import { extractFacts } from "./extractors.js";
import { classifyIntent } from "./intent.js";
import { analyzeSentiment } from "./sentiment.js";
import { chooseNextQuestion } from "./questions.js";
import { detectContradictions } from "./contradictions.js";

function id(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function inferPrimaryPriority(intent) {
  const map = {
    LOWER_BILL: "price",
    IMPROVE_RELIABILITY: "reliability",
    IMPROVE_SPEED: "speed",
    IMPROVE_WIFI: "wifi_coverage",
    SUPPORT_GAMING: "latency",
    SUPPORT_REMOTE_WORK: "reliability",
    SUPPORT_STREAMING: "speed",
  };
  return map[intent] || null;
}

export class SemanticUnderstandingEngine {
  constructor({ clock = () => new Date().toISOString() } = {}) {
    this.clock = clock;
  }

  analyze({ text, channel = "web", customerId = null, sessionId = null, twin = null } = {}) {
    const normalizedText = normalizeText(text);
    if (!normalizedText) throw new Error("text is required.");

    const intent = classifyIntent(normalizedText);
    const sentiment = analyzeSentiment(normalizedText);
    const facts = extractFacts(normalizedText);

    const priority = inferPrimaryPriority(intent.primary);
    if (priority && !facts.some((item) => item.domain === "goals" && item.key === "primaryPriority")) {
      facts.push({
        domain: "goals",
        key: "primaryPriority",
        value: priority,
        source: "inferred",
        confidence: 0.78,
        evidence: normalizedText,
      });
    }

    if (sentiment.urgency !== "normal" && !facts.some((item) => item.domain === "buyingSignals" && item.key === "urgency")) {
      facts.push({
        domain: "buyingSignals",
        key: "urgency",
        value: sentiment.urgency,
        source: "inferred",
        confidence: 0.8,
        evidence: normalizedText,
      });
    }

    const contradictions = detectContradictions(twin, facts);
    const analysis = {
      id: id("semantic"),
      version: SEMANTIC_ENGINE_VERSION,
      customerId,
      sessionId,
      channel,
      originalText: text,
      normalizedText,
      intent,
      sentiment,
      facts,
      contradictions,
      entities: facts.map(({ domain, key, value, confidence }) => ({ domain, key, value, confidence })),
      analyzedAt: this.clock(),
    };

    analysis.nextBestQuestion = chooseNextQuestion({ twin, analysis });
    analysis.understandingConfidence = Number((
      (intent.confidence * 0.35) +
      (Math.min(1, facts.length / 5) * 0.45) +
      ((contradictions.length ? 0.4 : 1) * 0.20)
    ).toFixed(2));

    return analysis;
  }
}
