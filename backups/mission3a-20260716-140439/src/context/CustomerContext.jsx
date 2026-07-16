import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createBrainSession } from "../services/brain/brain";

const STORAGE_KEY = "connectiq:advisor:v1.0.0";
const DEFAULT_MESSAGE = {
  role: "advisor",
  text: "Hi! I’m your ConnectIQ Advisor. Use the guided steps to find service, and message me anytime with questions about providers, pricing, installation, Wi-Fi, or switching.",
};
const DEFAULT_CUSTOMER = {
  name: "",
  email: "",
  phone: "",
  consent: false,
  contactPreferences: { text: false, phone: false, email: false },
  futureOffersOptIn: false,
  buyingTimeline: "",
  contactTime: "asap",
};

const CustomerContext = createContext(null);

function loadSavedState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

export function CustomerContextProvider({ children }) {
  const saved = useMemo(() => loadSavedState(), []);
  const [session, setSession] = useState(() => saved?.session || createBrainSession());
  const [address, setAddress] = useState(() => saved?.address || "");
  const [messages, setMessages] = useState(() => saved?.messages || [DEFAULT_MESSAGE]);
  const [customer, setCustomer] = useState(() => ({ ...DEFAULT_CUSTOMER, ...(saved?.customer || {}), contactPreferences: { ...DEFAULT_CUSTOMER.contactPreferences, ...(saved?.customer?.contactPreferences || {}) } }));
  const [contactStep, setContactStep] = useState(() => saved?.contactStep || 0);
  const [discoveryStep, setDiscoveryStep] = useState(() => saved?.discoveryStep || 0);
  const [order, setOrder] = useState(() => saved?.order || null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ session, address, messages, customer, contactStep, discoveryStep, order }),
    );
  }, [session, address, messages, customer, contactStep, discoveryStep, order]);

  const resetCustomerContext = ({ openChat = false } = {}) => {
    setSession(createBrainSession());
    setAddress("");
    setMessages([DEFAULT_MESSAGE]);
    setCustomer(DEFAULT_CUSTOMER);
    setContactStep(0);
    setDiscoveryStep(0);
    setOrder(null);
    setChatOpen(openChat);
  };

  const customerContext = useMemo(
    () => ({
      sessionId: session.sessionId,
      workflowStep: session.step,
      address: session.address || address,
      location: session.location,
      household: {
        people: session.needs?.people,
        devices: session.needs?.devices,
      },
      priorities: {
        primary: session.needs?.priority,
        workFromHome: Boolean(session.needs?.workFromHome),
        streaming: Boolean(session.needs?.streaming),
        gaming: Boolean(session.needs?.gaming),
        creator: Boolean(session.needs?.creator),
        reliability: Boolean(session.needs?.reliability),
      },
      budget: session.needs?.budget,
      providers: session.providers || [],
      recommendation: session.recommendation,
      quote: session.quote,
      customer,
      conversation: messages,
      order,
    }),
    [session, address, customer, messages, order],
  );

  const value = useMemo(
    () => ({
      customerContext,
      session,
      setSession,
      address,
      setAddress,
      messages,
      setMessages,
      customer,
      setCustomer,
      contactStep,
      setContactStep,
      discoveryStep,
      setDiscoveryStep,
      order,
      setOrder,
      chatOpen,
      setChatOpen,
      resetCustomerContext,
    }),
    [customerContext, session, address, messages, customer, contactStep, discoveryStep, order, chatOpen],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomerContext() {
  const context = useContext(CustomerContext);
  if (!context) throw new Error("useCustomerContext must be used within CustomerContextProvider");
  return context;
}
