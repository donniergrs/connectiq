import { addDoc, arrayUnion, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
const API_BASE=(import.meta.env.VITE_FUNCTIONS_BASE_URL || "http://localhost:5001").replace(/\/$/,"");
async function json(url,options={}){ const response=await fetch(url,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options}); const data=await response.json(); if(!response.ok||data.ok===false) throw new Error(data.error||"QuoteIQ request failed."); return data; }
export async function createQuote(payload,{persist=true}={}){ const quote=await json(`${API_BASE}/api/quotes/create`,{method:"POST",body:JSON.stringify(payload)}); if(persist) await persistQuote(quote); return quote; }
export const getQuote=id=>json(`${API_BASE}/api/quotes/${encodeURIComponent(id)}`);
export const compareQuote=(id,planIds=[])=>json(`${API_BASE}/api/quotes/${encodeURIComponent(id)}/compare`,{method:"POST",body:JSON.stringify({planIds})});
export async function selectQuote(id,planId,{leadId}={}){ const quote=await json(`${API_BASE}/api/quotes/${encodeURIComponent(id)}/select`,{method:"POST",body:JSON.stringify({planId})}); await persistQuote(quote); if(leadId) await updateDoc(doc(db,"leads",leadId),{pipelineStage:"Quote Ready",quoteId:id,selectedPlanId:planId,updatedAt:serverTimestamp()}); return quote; }
export async function persistQuote(quote){ await setDoc(doc(db,"quotes",quote.quoteId),{...quote,createdAtServer:serverTimestamp(),updatedAtServer:serverTimestamp()},{merge:true}); await addDoc(collection(db,"quoteVersions"),{quoteId:quote.quoteId,version:quote.version,status:quote.status,snapshot:quote,createdAt:serverTimestamp()}); if(quote.leadId) await updateDoc(doc(db,"leads",quote.leadId),{pipelineStage:"Quote Ready",quoteId:quote.quoteId,quoteStatus:quote.status,quoteUpdatedAt:serverTimestamp(),updatedAt:serverTimestamp()}); }

export async function createManualQuote({ lead, workspace, form, savings }) {
  const quoteId = `qt_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const quoteNumber = `CIQ-${Date.now().toString(36).toUpperCase()}`;
  const publicUrl = `${window.location.origin}/quote/${quoteId}`;
  const quote = {
    quoteId, quoteNumber, leadId: lead.id, status: "QUOTE_READY", version: 1, publicUrl,
    customer: { name: workspace.customer?.name || lead.name || "Customer", email: workspace.customer?.email || lead.email || "", phone: workspace.customer?.phone || lead.phone || "", address: workspace.customer?.address || lead.address || "" },
    currentService: { provider: workspace.household?.currentProvider || lead.currentProvider || "Not captured", monthlyBill: Number(lead.monthlyBill || lead.currentMonthlyBill || 0) || null },
    offer: { provider: form.provider, plan: form.plan, technology: form.technology, download: Number(form.download)||null, upload: Number(form.upload)||null, monthlyPrice: Number(form.monthlyPrice), promotion: form.promotion, equipmentFee: Number(form.equipmentFee)||0, installationFee: Number(form.installationFee)||0, contract: form.contract },
    reasons: form.reasons.split("\n").map(v=>v.trim()).filter(Boolean), advisorNotes: form.advisorNotes, expirationDate: form.expirationDate, estimatedMonthlySavings: savings, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  await setDoc(doc(db,"quotes",quoteId),{...quote,createdAtServer:serverTimestamp(),updatedAtServer:serverTimestamp()});
  await updateDoc(doc(db,"leads",lead.id),{status:"Quote Sent",quoteId,quoteNumber,quoteStatus:"QUOTE_READY",quoteUpdatedAt:serverTimestamp(),updatedAt:serverTimestamp(),opportunityJournal:arrayUnion({id:`quote_${Date.now()}`,type:"quote_generated",title:"Customer quote prepared",detail:`${quoteNumber} created for ${form.provider} ${form.plan}.`,createdAt:new Date().toISOString(),createdBy:{name:"ConnectIQ Advisor"}})});
  return quote;
}
export function buildQuoteEmail(quote){ return { subject:`Your ConnectIQ recommendation — ${quote.offer.provider} ${quote.offer.plan}`, body:`Hi ${quote.customer.name?.split(" ")[0]||"there"},\n\nI prepared your personalized internet recommendation. Review the plan, pricing, and next steps here:\n\n${quote.publicUrl}\n\nWhen you are ready, click “Click Here to Order” on the recommendation and ConnectIQ will help complete the next step.\n\nPricing, promotions, availability, taxes, fees, and installation details will be verified before ordering.\n\nConnectIQ`}; }
