import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { normalizeOrder, ORDER_STATUSES } from "./revenueModels.js";

export async function listOrders() {
  const snapshot = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => normalizeOrder({ id: item.id, ...item.data() }));
}

export async function createOrder(order) {
  const normalized = normalizeOrder(order);
  const ref = await addDoc(collection(db, "orders"), { ...normalized, id: undefined, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateOrderStatus(orderId, status, externalOrderId = "") {
  if (!ORDER_STATUSES.includes(status)) throw new Error("Unsupported order status.");
  await updateDoc(doc(db, "orders", orderId), { status, externalOrderId, updatedAt: serverTimestamp() });
}

export { ORDER_STATUSES };
