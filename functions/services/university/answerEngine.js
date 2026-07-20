import { retrieveKnowledge } from "./retrieval.js";

function intentOf(message) {
  const text = String(message || "").toLowerCase();
  if (/how (is|good).*service|reliable|reliability|outage/.test(text)) return "service_quality";
  if (/how much|price|cost|bill|fee/.test(text)) return "pricing";
  if (/mobile|cell phone|wireless plan/.test(text)) return "mobile";
  if (/install|appointment|self install/.test(text)) return "installation";
  if (/wifi|wi-fi|dead zone|mesh/.test(text)) return "wifi";
  if (/compare|alternative|versus| vs /.test(text)) return "comparison";
  if (/why|best|recommend/.test(text)) return "explanation";
  return "general";
}

export function answerFromUniversity({ message, providerName, customer = {} } = {}) {
  const intent = intentOf(message);
  const knowledge = retrieveKnowledge({ message, providerName });
  const provider = knowledge.provider;
  const article = knowledge.articles[0];
  let answer;

  if (intent === "pricing") {
    answer = provider ? `I can help compare ${provider.name}, but I do not have a verified address-specific price in this conversation. Pricing, fees, equipment, and promotions must be confirmed for the service address.` : "I can compare the total monthly cost, but I need an address-specific provider offer or verified quote before stating an exact price.";
  } else if (intent === "service_quality") {
    answer = provider ? `${provider.name} uses ${provider.technology.join(" and ")} technology in its footprint. Its potential strengths include ${provider.strengths.slice(0, 2).join(" and ")}. I would not claim local reliability without address-level and market evidence; ${provider.cautions[0]}.` : "Service quality depends on the technology available at the address, local network conditions, in-home Wi-Fi, and support experience. I can explain the tradeoffs once we identify the provider and technology at the address.";
  } else if (intent === "mobile") {
    answer = provider?.services.includes("mobile") ? `${provider.name} offers mobile service in at least part of its portfolio. Eligibility, wireless coverage, device terms, and bundle pricing still need to be verified.` : provider ? `I do not have verified knowledge that ${provider.name} includes mobile service in this profile. I would verify the current provider offer rather than assume.` : "Some internet providers offer mobile bundles, but eligibility and terms vary. I can check the selected provider's verified profile.";
  } else if (intent === "installation") {
    answer = `${provider ? `${provider.name} installation` : "Installation"} may be professional or self-install depending on the address, technology, equipment, and network readiness. I would confirm the appointment and keep existing service active until the new connection works.`;
  } else if (intent === "wifi") {
    answer = "Internet speed and Wi-Fi coverage are separate. I would check home size, floors, router location, construction materials, and dead zones before deciding whether a mesh system is needed.";
  } else if (intent === "explanation" && provider) {
    const fit = customer.workFromHome ? "your work-from-home requirement" : customer.gaming ? "your gaming needs" : "the needs you shared";
    answer = `${provider.name} may fit ${fit} because ${provider.strengths.slice(0, 2).join(" and ")}. The tradeoff is that ${provider.cautions[0]}. I would still verify the exact technology and offer at the address.`;
  } else if (article) {
    answer = article.content.summary;
  } else {
    answer = "I understand the question, but I do not yet have enough verified information to give a provider-specific answer. I can ask one focused question or verify the available provider data instead of guessing.";
  }

  return { intent, answer, knowledge, grounded: Boolean(provider || article), confidence: knowledge.confidence };
}
