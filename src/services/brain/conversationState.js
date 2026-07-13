export const CONVERSATION_STATES = Object.freeze({
  GREETING: "GREETING",
  ADDRESS: "ADDRESS",
  LOOKUP: "LOOKUP",
  DISCOVERY: "DISCOVERY",
  RECOMMENDATION: "RECOMMENDATION",
  COMPARE: "COMPARE",
  QUOTE: "QUOTE",
  CUSTOMER_INFO: "CUSTOMER_INFO",
  READY: "READY",
  COMPLETE: "COMPLETE",
  ERROR: "ERROR",
});

export const initialConversationState = () => ({
  step: CONVERSATION_STATES.GREETING,
  address: "",
  lookupSource: "",
  providers: [],
  recommendation: null,
  needs: {
    people: 2,
    devices: 5,
    workFromHome: false,
    streaming: true,
    gaming: false,
    creator: false,
    reliability: true,
  },
  quote: null,
  orderId: null,
  leadId: null,
  error: "",
});
