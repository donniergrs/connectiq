import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function createLead({ name, email, phone, address = "", priority = "General inquiry", message = "", source = "website", providers = [], recommendedProvider = "", status = "New Lead" }) {
  return addDoc(collection(db, "leads"), {
    name,
    email,
    phone,
    address,
    priority,
    message,
    source,
    providers,
    recommendedProvider,
    status,
    advisorNotes: "",
    activity: [
      {
        type: "created",
        status,
        note: `Lead created from ${source}`,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
