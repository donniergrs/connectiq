import { CONVERSATION_STATES } from "./conversationState";
import { answerCommonQuestion } from "./knowledgeBase";
import { buildQuote } from "./quoteEngine";
import { rankProviders, selectRecommendation } from "./recommendationEngine";

export function greetingMessage() {
  return {
    role: "advisor",
    text:
      "Hi! I’m your ConnectIQ Internet Advisor. I can compare providers at your address, answer questions, and prepare an order in just a few minutes. What is your service address?",
  };
}

export function providerRecommendationMessage(recommendation, providerCount) {
  if (!recommendation) {
    return {
      role: "advisor",
      text:
        "I couldn’t find a recommendation for that address yet. Please verify the address or submit your contact information so we can investigate it.",
    };
  }

  return {
    role: "advisor",
    text: `Great news — I found ${providerCount} provider option${
      providerCount === 1 ? "" : "s"
    }. My top recommendation is ${recommendation.displayName} with ${
      recommendation.download || "available"
    } Mbps download speed. It earned a ${recommendation.advisorScore}/100 ConnectIQ score.`,
  };
}

export function answerQuestionMessage(question) {
  return {
    role: "advisor",
    text: answerCommonQuestion(question),
  };
}

export function createQuoteFromState(state) {
  return buildQuote({
    recommendation: state.recommendation,
    address: state.address,
    needs: state.needs,
  });
}

export function applyProviderResults(state, providers) {
  const rankedProviders = rankProviders(providers);
  const recommendation = selectRecommendation(rankedProviders);

  return {
    ...state,
    step: recommendation
      ? CONVERSATION_STATES.RECOMMENDATION
      : CONVERSATION_STATES.ERROR,
    providers: rankedProviders,
    recommendation,
    quote: recommendation
      ? buildQuote({
          recommendation,
          address: state.address,
          needs: state.needs,
        })
      : null,
  };
}
