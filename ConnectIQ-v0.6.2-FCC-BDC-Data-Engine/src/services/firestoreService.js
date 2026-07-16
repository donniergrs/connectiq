import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function saveLookup({ address, providers, user }) {
  return addDoc(collection(db, "lookups"), {
    address,
    providers,
    searchedBy: user?.email || "unknown",
    createdAt: serverTimestamp(),
  });
}