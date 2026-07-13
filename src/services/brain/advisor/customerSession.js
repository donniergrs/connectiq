import { CONVERSATION_STATES } from "../conversationState";

export function createCustomerSession() {
  return {
    sessionId: globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`,
    step: CONVERSATION_STATES.GREETING,
    address: "",
    location: null,
    lookupSource: "",
    providers: [],
    recommendation: null,
    quote: null,
    needs: {
      people: 2,
      devices: 5,
      workFromHome: false,
      streaming: true,
      gaming: false,
      creator: false,
      reliability: true,
      budget: 100,
      priority: "reliability",
    },
    selectedProviderId: "",
    leadId: null,
    orderId: null,
    error: "",
  };
}
