import { lookupProviders } from "../fccService";
import { applyProviderResults } from "./conversationEngine";
import { initialConversationState, CONVERSATION_STATES } from "./conversationState";
import { createCustomerSession } from "./advisor/customerSession";
import { rankProviderOptions } from "./revenueOptimizer";

export function createBrainSession() {
  return { ...initialConversationState(), ...createCustomerSession() };
}

export async function lookupAddressWithBrain(state, address) {
  const nextState = { ...state, step: CONVERSATION_STATES.LOOKUP, address: address.trim(), error: "" };
  try {
    const result = await lookupProviders(address.trim());
    const rawProviders = Array.isArray(result?.providers) ? result.providers : [];
    const providers = rankProviderOptions(rawProviders, state.needs || {});
    return {
      ...applyProviderResults(nextState, providers, state.needs),
      step: providers.length ? CONVERSATION_STATES.DISCOVERY : CONVERSATION_STATES.ERROR,
      lookupSource: result?.source || "connectiq-intelligence",
      verificationRequired: result?.verificationRequired !== false,
      lookupTrace: result?.trace || [],
      location: result?.location || null,
      error: providers.length ? "" : "I could not identify provider candidates for this address. Please call or schedule time with a ConnectIQ advisor for manual verification.",
    };
  } catch (error) {
    return { ...nextState, step: CONVERSATION_STATES.ERROR, error: error?.message || "Unable to check this address right now." };
  }
}

export function updateNeedsWithBrain(state, needs) {
  const providers = rankProviderOptions(state.providers || [], needs || {});
  return applyProviderResults({ ...state, providers }, providers, needs);
}
