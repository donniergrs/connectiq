/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  loadRuntimeHistory, loadRuntimeSession, patchRuntimeSession,
  resumeRuntimeSession, saveRuntimeEvent, startRuntimeSession,
} from "../services/conversationRuntimeService";

const ConversationContext = createContext(null);

export function ConversationProvider({ children }) {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (operation) => {
    setLoading(true); setError("");
    try { return await operation(); }
    catch (err) { setError(err.message || "Conversation runtime error."); throw err; }
    finally { setLoading(false); }
  }, []);

  const startConversation = useCallback((input) => run(async () => {
    const next = await startRuntimeSession(input);
    setSession(next); setEvents([]); return next;
  }), [run]);

  const resumeConversation = useCallback((sessionId) => run(async () => {
    const current = await loadRuntimeSession(sessionId);
    if (!current) throw new Error("Conversation session not found.");
    const next = current.status === "PAUSED" ? await resumeRuntimeSession(sessionId) : current;
    const history = await loadRuntimeHistory(sessionId);
    setSession(next); setEvents(history); return next;
  }), [run]);

  const updateConversation = useCallback((patch) => run(async () => {
    if (!session?.sessionId) throw new Error("Start a conversation first.");
    const next = await patchRuntimeSession(session.sessionId, patch);
    setSession(next); return next;
  }), [run, session]);

  const addEvent = useCallback((event) => run(async () => {
    if (!session?.sessionId) throw new Error("Start a conversation first.");
    const saved = await saveRuntimeEvent(session.sessionId, event);
    setEvents((current) => [...current, saved]); return saved;
  }), [run, session]);

  const value = useMemo(() => ({
    session, events, loading, error, startConversation, resumeConversation,
    updateConversation, addEvent, clearConversation: () => { setSession(null); setEvents([]); setError(""); },
  }), [session, events, loading, error, startConversation, resumeConversation, updateConversation, addEvent]);

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversationRuntime() {
  const value = useContext(ConversationContext);
  if (!value) throw new Error("useConversationRuntime must be used inside ConversationProvider.");
  return value;
}
