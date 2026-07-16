import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

export async function createReadyToSubmitOrder({
  customer,
  address,
  providers,
  recommendation,
  quote,
  conversation,
  campaign = {},
}) {
  const payload = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address,
    status: "Ready to Submit",
    priority: "High",
    source: campaign.source || "AI Internet Advisor",
    campaign: campaign.campaign || "",
    medium: campaign.medium || "",
    providers,
    recommendedProvider: recommendation?.displayName || recommendation?.name || "",
    recommendationSnapshot: recommendation || null,
    quote: quote || null,
    conversation: conversation || [],
    autonomousJourney: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    activity: [
      {
        type: "AI Sale Qualified",
        status: "Ready to Submit",
        note: "Customer completed the ConnectIQ guided buying flow.",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const reference = await addDoc(collection(db, "leads"), payload);
  return { id: reference.id, ...payload };
}
