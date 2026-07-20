const POSITIVE = /\b(great|good|happy|love|excellent|fine|satisfied|works well)\b/gi;
const NEGATIVE = /\b(bad|terrible|awful|frustrated|angry|upset|hate|unreliable|slow|expensive|outage|outages|problem|issue|dropping|disconnecting|offline|buffering)\b/gi;
const URGENCY = /\b(urgent|today|right now|immediately|asap|can't work|cannot work|need it now)\b/gi;

export function analyzeSentiment(text) {
  const positive = [...text.matchAll(POSITIVE)].length;
  const negative = [...text.matchAll(NEGATIVE)].length;
  const urgent = [...text.matchAll(URGENCY)].length;
  const score = Math.max(-1, Math.min(1, (positive - negative) / Math.max(1, positive + negative)));

  return {
    label: score <= -0.35 ? "negative" : score >= 0.35 ? "positive" : "neutral",
    score: Number(score.toFixed(2)),
    urgency: urgent >= 2 ? "high" : urgent === 1 ? "medium" : "normal",
    frustration: negative >= 3 ? "high" : negative >= 1 ? "moderate" : "low",
  };
}
