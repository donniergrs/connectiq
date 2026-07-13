import { lookupProviders as lookupFccProviders } from "../fccService";
import { applyProviderResults } from "./conversationEngine";
import { initialConversationState, CONVERSATION_STATES } from "./conversationState";
import { createCustomerSession } from "./advisor/customerSession";

export function createBrainSession() {
  return { ...initialConversationState(), ...createCustomerSession() };
}

export async function lookupAddressWithBrain(state, address) {
  const nextState = { ...state, step: CONVERSATION_STATES.LOOKUP, address: address.trim(), error: "" };
  try {
    const result = await lookupFccProviders(address.trim());
    const providers = Array.isArray(result?.providers) ? result.providers : [];
    return {
      ...applyProviderResults(nextState, providers, state.needs),
      step: providers.length ? CONVERSATION_STATES.DISCOVERY : CONVERSATION_STATES.ERROR,
      lookupSource: result?.source || "fcc",
      location: result?.location || null,
    };
  } catch (error) {
    return { ...nextState, step: CONVERSATION_STATES.ERROR, error: error?.message || "Unable to check this address right now." };
  }
}

export function updateNeedsWithBrain(state, needs) {
  return applyProviderResults(state, state.providers, needs);
}
