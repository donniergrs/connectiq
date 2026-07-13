import { CONVERSATION_STATES } from "./conversationState";
import { answerCommonQuestion } from "./knowledgeBase";
import { buildQuote } from "./quoteEngine";
import { rankProviders } from "./recommendationEngine";
import { answerQuoteQuestion } from "./quote/quoteAdvisor.js";

export function greetingMessage() {
  return { role: "advisor", text: "Hi! I’m your ConnectIQ Internet Advisor. Enter your service address and I’ll compare the options available there." };
}

export function providerRecommendationMessage(recommendation, providerCount) {
  if (!recommendation) {
    return { role: "advisor", text: "I couldn’t verify providers for that address. Check the address and try again, or leave your information so ConnectIQ can research it." };
  }
  return {
    role: "advisor",
    text: `I found ${providerCount} option${providerCount === 1 ? "" : "s"}. Based on your household, ${recommendation.displayName} is the strongest match at ${recommendation.advisorScore}/100. ${recommendation.recommendationReason}`,
  };
}

export function answerQuestionMessage(question, context = {}) {
  const quoteAnswer = answerQuoteQuestion(question, context);
  return { role: "advisor", text: quoteAnswer || answerCommonQuestion(question, context) };
}

export function applyProviderResults(state, providers, needs = state.needs) {
  const rankedProviders = rankProviders(providers, needs);
  const recommendation = rankedProviders[0] || null;
  return {
    ...state,
    needs,
    step: recommendation ? CONVERSATION_STATES.RECOMMENDATION : CONVERSATION_STATES.ERROR,
    providers: rankedProviders,
    recommendation,
    quote: recommendation ? buildQuote({ recommendation, address: state.address, needs }) : null,
    error: recommendation ? "" : "No verified provider records were returned for this address.",
  };
}
