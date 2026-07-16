import { CONVERSATION_STATES } from "../conversationState";

export function advisorMessageForStep(step, context = {}) {
  const count = context.providers?.length || 0;
  const name = context.recommendation?.displayName || "your best match";
  const messages = {
    [CONVERSATION_STATES.GREETING]: "Hi! I’m your ConnectIQ Advisor. I’ll compare every provider available at your address and help you choose confidently.",
    [CONVERSATION_STATES.ADDRESS]: "What address needs internet service?",
    [CONVERSATION_STATES.LOOKUP]: "I’m checking verified broadband availability and comparing technologies now.",
    [CONVERSATION_STATES.DISCOVERY]: `Great news — I found ${count} option${count === 1 ? "" : "s"}. Answer a few quick questions so I can match the right service to your household.`,
    [CONVERSATION_STATES.RECOMMENDATION]: `Based on what you told me, ${name} is the strongest fit. I’ll show you exactly why and how it compares.`,
    [CONVERSATION_STATES.QUOTE]: `I’ve prepared a personalized estimate for ${name}. Review it, then I’ll create your order package.`,
    [CONVERSATION_STATES.CUSTOMER_INFO]: "You’re almost done. I only need your contact details so ConnectIQ can verify the final offer and installation options.",
    [CONVERSATION_STATES.READY]: "Your Ready-to-Submit order package has been created and placed in the ConnectIQ queue.",
  };
  return messages[step] || "I’m here to help you choose the right internet service.";
}

export function nextDiscoveryQuestion(needs = {}) {
  if (!needs.people) return "How many people use the connection?";
  if (!needs.devices) return "About how many devices connect regularly?";
  if (!needs.priority) return "What matters most: price, speed, or reliability?";
  return "I have enough information to make your recommendation.";
}
