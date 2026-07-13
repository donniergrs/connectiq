const FAQ = [
  { patterns: ["contract", "agreement", "cancel"], answer: "Contract terms vary by provider and promotion. ConnectIQ displays the best available estimate, and the final term is confirmed before submission." },
  { patterns: ["installation", "install", "technician"], answer: "Installation timing depends on the provider and address. Your preferred timing is captured now, then confirmed when the order is finalized." },
  { patterns: ["router", "wifi", "wi-fi", "equipment"], answer: "Most providers include or offer compatible Wi-Fi equipment. Equipment pricing and whole-home Wi-Fi options are confirmed with the selected plan." },
  { patterns: ["switch", "current provider", "disconnect"], answer: "Keep your current service active until the new installation is complete and tested. That prevents an avoidable loss of service while switching." },
  { patterns: ["gaming", "latency", "lag"], answer: "For gaming, prioritize low latency, stable connections, and adequate upload speed. Fiber is normally the strongest option when available." },
  { patterns: ["work", "zoom", "teams", "home office"], answer: "Work-from-home households benefit from reliable upload speed and enough capacity for video calls while other devices are active." },
  { patterns: ["price", "cost", "monthly", "fee"], answer: "The displayed price is an estimate based on current product intelligence. Final pricing, taxes, equipment, and eligibility are verified before submission." },
];

export function answerCommonQuestion(message = "", context = {}) {
  const normalized = String(message).toLowerCase();
  const match = FAQ.find((item) => item.patterns.some((pattern) => normalized.includes(pattern)));
  if (match) return match.answer;

  const recommendation = context.recommendation;
  if (recommendation) {
    return `${recommendation.displayName} is currently the top ConnectIQ match because of its speed, technology, and household fit. You can ask about price, installation, Wi-Fi, contracts, gaming, working from home, or switching providers.`;
  }
  return "I can help with availability, speed, pricing, installation, equipment, contracts, and switching providers.";
}
