import { lookupProviders as lookupFccProviders } from "../fccService";
import { applyProviderResults } from "./conversationEngine";
import { initialConversationState, CONVERSATION_STATES } from "./conversationState";

export function createBrainSession() {
  return initialConversationState();
}

export async function lookupAddressWithBrain(state, address) {
  const nextState = {
    ...state,
    step: CONVERSATION_STATES.LOOKUP,
    address: address.trim(),
    error: "",
  };

  try {
    const result = await lookupFccProviders(address.trim());
    const providers = Array.isArray(result?.providers) ? result.providers : [];
    return applyProviderResults(nextState, providers);
  } catch (error) {
    return {
      ...nextState,
      step: CONVERSATION_STATES.ERROR,
      error: error?.message || "Unable to check this address right now.",
    };
  }
}
