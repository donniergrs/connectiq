const FAQ = [
  {
    patterns: ["gaming", "gamer", "latency", "ping"],
    answer:
      "Fiber is usually the strongest choice for gaming because it offers low latency and strong upload performance. I will prioritize fiber when it is available.",
  },
  {
    patterns: ["work from home", "working from home", "zoom", "teams", "video call"],
    answer:
      "For working from home, reliable upload speed and low latency matter. Fiber is usually the best fit, followed by strong cable or fixed-wireless options.",
  },
  {
    patterns: ["contract", "agreement"],
    answer:
      "Contract requirements vary by provider and offer. Your quote will show the current contract terms before you move forward.",
  },
  {
    patterns: ["installation", "install", "technician"],
    answer:
      "Installation timing depends on the provider and your address. ConnectIQ will capture your preferred date, and the final appointment is confirmed during order submission.",
  },
  {
    patterns: ["router", "wifi", "wi-fi", "equipment"],
    answer:
      "Most providers include or offer compatible Wi-Fi equipment. Equipment charges and whole-home Wi-Fi options are confirmed with the selected plan.",
  },
  {
    patterns: ["phone number", "keep my number", "port"],
    answer:
      "Phone-number transfers are often available when voice service is included. The number must remain active until the transfer is complete.",
  },
  {
    patterns: ["price", "cost", "monthly"],
    answer:
      "Pricing varies by address, provider, speed, and promotion. I will show the estimated monthly price in your recommendation and quote.",
  },
];

export function answerCommonQuestion(message = "") {
  const normalized = String(message).toLowerCase();
  const match = FAQ.find((item) =>
    item.patterns.some((pattern) => normalized.includes(pattern))
  );

  return (
    match?.answer ||
    "I can help with availability, speeds, pricing, installation, contracts, equipment, and switching providers. Ask your question, or continue to a personalized quote."
  );
}
