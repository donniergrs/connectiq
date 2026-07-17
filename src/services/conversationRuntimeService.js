import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Conversation runtime request failed (${response.status}).`);
  return payload;
}

export async function startRuntimeSession(input = {}) {
  const payload = await request("/api/conversations/sessions", { method: "POST", body: JSON.stringify(input) });
  await persistSession(payload.session);
  return payload.session;
}

export async function loadRuntimeSession(sessionId) {
  try {
    const payload = await request(`/api/conversations/sessions/${encodeURIComponent(sessionId)}`);
    return payload.session;
  } catch {
    const snapshot = await getDoc(doc(db, "conversationSessions", sessionId));
    return snapshot.exists() ? { sessionId: snapshot.id, ...snapshot.data() } : null;
  }
}

export async function patchRuntimeSession(sessionId, patch) {
  const payload = await request(`/api/conversations/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH", body: JSON.stringify(patch),
  });
  await persistSession(payload.session);
  return payload.session;
}

export async function resumeRuntimeSession(sessionId) {
  const payload = await request(`/api/conversations/sessions/${encodeURIComponent(sessionId)}/resume`, { method: "POST" });
  await persistSession(payload.session);
  return payload.session;
}

export async function saveRuntimeEvent(sessionId, event) {
  const payload = await request(`/api/conversations/sessions/${encodeURIComponent(sessionId)}/events`, {
    method: "POST", body: JSON.stringify(event),
  });
  await addDoc(collection(db, "conversationEvents"), { ...payload.event, createdAtServer: serverTimestamp() });
  return payload.event;
}

export async function loadRuntimeHistory(sessionId) {
  try {
    const payload = await request(`/api/conversations/sessions/${encodeURIComponent(sessionId)}/events`);
    return payload.events || [];
  } catch {
    const q = query(collection(db, "conversationEvents"), where("sessionId", "==", sessionId), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }
}

export async function persistSession(session) {
  if (!session?.sessionId) return;
  await setDoc(doc(db, "conversationSessions", session.sessionId), {
    ...session,
    updatedAtServer: serverTimestamp(),
  }, { merge: true });
  if (session.conversationId) {
    await setDoc(doc(db, "conversations", session.conversationId), {
      conversationId: session.conversationId,
      sessionId: session.sessionId,
      customerId: session.customerId || null,
      channel: session.channel,
      status: session.status,
      stage: session.stage,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  }
}
