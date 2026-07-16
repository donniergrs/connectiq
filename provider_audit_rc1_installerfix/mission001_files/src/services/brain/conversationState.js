export const CONVERSATION_STATES = Object.freeze({
  GREETING: "GREETING",
  ADDRESS: "ADDRESS",
  LOOKUP: "LOOKUP",
  RECOMMENDATION: "RECOMMENDATION",
  DISCOVERY: "DISCOVERY",
  QUOTE: "QUOTE",
  CUSTOMER_INFO: "CUSTOMER_INFO",
  READY: "READY",
  COMPLETE: "COMPLETE",
  ERROR: "ERROR",
});

export const initialConversationState = () => ({
  step: CONVERSATION_STATES.GREETING,
  address: "",
  providers: [],
  recommendation: null,
  needs: [],
  quote: null,
  customer: {
    name: "",
    email: "",
    phone: "",
  },
  orderId: null,
  error: "",
});
