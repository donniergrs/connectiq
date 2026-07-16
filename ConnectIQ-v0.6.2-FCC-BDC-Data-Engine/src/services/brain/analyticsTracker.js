import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export async function trackConversionEvent(eventName, session = {}, metadata = {}) {
  try {
    await addDoc(collection(db, "conversionEvents"), {
      eventName,
      sessionId: session.sessionId || "",
      step: session.step || "",
      address: session.address || "",
      recommendedProvider: session.recommendation?.displayName || "",
      ...metadata,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Analytics must never interrupt a customer purchase journey.
  }
}
