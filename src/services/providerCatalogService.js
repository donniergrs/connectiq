import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "providerCatalog";

export const DEFAULT_PROVIDER_CATALOG = [
  {
    id: "att-fiber",
    providerName: "AT&T Fiber",
    technology: "Fiber",
    active: true,
    serviceNotes: "Symmetrical fiber service where available. Verify address-specific plans, pricing, fees, and promotions before quoting.",
    strengths: ["Symmetrical upload and download", "Low latency", "Strong remote-work fit"],
    weaknesses: ["Availability varies by address", "Promotions can change"],
    equipment: "Gateway included or provider-supplied; verify current terms.",
    installation: "Professional or self-install depending on address and existing facilities.",
    supportNotes: "Confirm current support channels and hours before publishing customer-facing details.",
    commissionValue: 0,
    plans: [
      { id: "att-300", name: "Internet 300", downloadMbps: 300, uploadMbps: 300, monthlyPrice: 0, equipmentFee: 0, installationFee: 0, contract: "Verify", active: true },
      { id: "att-500", name: "Internet 500", downloadMbps: 500, uploadMbps: 500, monthlyPrice: 0, equipmentFee: 0, installationFee: 0, contract: "Verify", active: true },
      { id: "att-1000", name: "Internet 1000", downloadMbps: 1000, uploadMbps: 1000, monthlyPrice: 0, equipmentFee: 0, installationFee: 0, contract: "Verify", active: true },
    ],
    promotions: [],
    faqs: [
      { question: "Is upload speed symmetrical?", answer: "Fiber plans are commonly symmetrical, but the exact plan must be verified for the service address." },
    ],
  },
  {
    id: "spectrum",
    providerName: "Spectrum",
    technology: "Cable",
    active: true,
    serviceNotes: "Widely available cable service. Verify plan speeds, upload speeds, pricing, equipment, and promotions for the address.",
    strengths: ["Broad availability", "Multiple speed tiers", "No annual contract on many offers"],
    weaknesses: ["Upload speeds may be lower than fiber", "Pricing can change after promotions"],
    equipment: "Modem and Wi-Fi equipment terms vary by offer.",
    installation: "Self-install or professional installation depending on serviceability.",
    supportNotes: "Use verified provider information for customer-facing claims.",
    commissionValue: 0,
    plans: [
      { id: "spectrum-500", name: "Internet 500", downloadMbps: 500, uploadMbps: 0, monthlyPrice: 0, equipmentFee: 0, installationFee: 0, contract: "Verify", active: true },
      { id: "spectrum-1000", name: "Internet Gig", downloadMbps: 1000, uploadMbps: 0, monthlyPrice: 0, equipmentFee: 0, installationFee: 0, contract: "Verify", active: true },
    ],
    promotions: [],
    faqs: [],
  },
  {
    id: "lumos-fiber",
    providerName: "Lumos Fiber",
    technology: "Fiber",
    active: true,
    serviceNotes: "Fiber provider serving selected markets. Verify exact address eligibility and current product details.",
    strengths: ["Fiber technology", "Strong upload performance", "Low-latency use cases"],
    weaknesses: ["Limited footprint", "Product details vary by market"],
    equipment: "Verify current Wi-Fi and gateway options.",
    installation: "Professional installation may be required.",
    supportNotes: "Maintain market-specific information in the catalog.",
    commissionValue: 0,
    plans: [],
    promotions: [],
    faqs: [],
  },
];

function cleanArray(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

export function normalizeProviderCatalogRecord(record = {}) {
  return {
    providerName: String(record.providerName || "").trim(),
    technology: String(record.technology || "Unknown").trim(),
    active: record.active !== false,
    serviceNotes: String(record.serviceNotes || "").trim(),
    strengths: cleanArray(record.strengths),
    weaknesses: cleanArray(record.weaknesses),
    equipment: String(record.equipment || "").trim(),
    installation: String(record.installation || "").trim(),
    supportNotes: String(record.supportNotes || "").trim(),
    commissionValue: Number(record.commissionValue || 0),
    plans: cleanArray(record.plans),
    promotions: cleanArray(record.promotions),
    faqs: cleanArray(record.faqs),
  };
}

export async function listProviderCatalog() {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy("providerName")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createProviderCatalogRecord(record) {
  const payload = normalizeProviderCatalogRecord(record);
  const result = await addDoc(collection(db, COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    catalogVersion: "AI-009-v1.0.0",
  });
  return result.id;
}

export async function saveProviderCatalogRecord(id, record) {
  const payload = normalizeProviderCatalogRecord(record);
  await updateDoc(doc(db, COLLECTION, id), {
    ...payload,
    updatedAt: serverTimestamp(),
    catalogVersion: "AI-009-v1.0.0",
  });
}

export async function removeProviderCatalogRecord(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function seedProviderCatalog() {
  for (const provider of DEFAULT_PROVIDER_CATALOG) {
    const { id, ...payload } = provider;
    await setDoc(doc(db, COLLECTION, id), {
      ...normalizeProviderCatalogRecord(payload),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      catalogVersion: "AI-009-v1.0.0",
      seeded: true,
    }, { merge: true });
  }
}

export function findCatalogMatches(providers = [], searchText = "") {
  const term = String(searchText || "").trim().toLowerCase();
  if (!term) return providers;
  return providers.filter((provider) => {
    const corpus = [
      provider.providerName,
      provider.technology,
      provider.serviceNotes,
      provider.equipment,
      provider.installation,
      ...(provider.strengths || []),
      ...(provider.weaknesses || []),
      ...(provider.plans || []).flatMap((plan) => [plan.name, plan.contract]),
      ...(provider.promotions || []).flatMap((promo) => [promo.name, promo.description]),
      ...(provider.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
    ].join(" ").toLowerCase();
    return corpus.includes(term);
  });
}
