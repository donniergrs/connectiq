import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { db } from "../firebase";
const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v||0));
export default function PublicQuote(){
 const {quoteId}=useParams(); const [quote,setQuote]=useState(null); const [error,setError]=useState(""); const [ordered,setOrdered]=useState(false);
 useEffect(()=>{(async()=>{try{const ref=doc(db,"quotes",quoteId); const snap=await getDoc(ref); if(!snap.exists()) throw new Error("Quote not found"); setQuote({id:snap.id,...snap.data()}); await updateDoc(ref,{status:"VIEWED",viewedAt:serverTimestamp(),updatedAt:serverTimestamp()});}catch(e){setError(e.message)}})()},[quoteId]);
 async function order(){ const ref=doc(db,"quotes",quoteId); await updateDoc(ref,{status:"ORDER_REQUESTED",orderRequestedAt:serverTimestamp(),updatedAt:serverTimestamp()}); if(quote.leadId) await updateDoc(doc(db,"leads",quote.leadId),{status:"Customer Accepted",quoteStatus:"ORDER_REQUESTED",updatedAt:serverTimestamp()}); setOrdered(true); }
 if(error)return <main className="public-quote-state"><h1>We could not open this quote.</h1><p>{error}</p></main>; if(!quote)return <main className="public-quote-state"><p>Loading your recommendation…</p></main>;
 const f=quote.offer||{}; return <main className="public-quote-page"><article className="public-quote-sheet"><header><div className="quoteiq-brand">Connect<span>IQ</span></div><div><small>Quote {quote.quoteNumber}</small><p>Valid through {quote.expirationDate}</p></div></header><span className="quoteiq-kicker">Your Personalized Internet Recommendation</span><h1>Hi {quote.customer?.name?.split(" ")[0]||"there"}, here is the service selected for you.</h1><p className="public-quote-address">{quote.customer?.address}</p>
 <section className="public-quote-offer"><small>Recommended service</small><h2>{f.provider}</h2><h3>{f.plan}</h3><strong>{money(f.monthlyPrice)}<span>/month</span></strong><p>{f.download||"—"} Mbps download · {f.upload||"—"} Mbps upload · {f.technology||"Broadband"}</p></section>
 <section className="public-quote-reasons"><h3>Why ConnectIQ recommends this</h3>{(quote.reasons||[]).map((r,i)=><p key={i}><CheckCircle2 size={17}/>{r}</p>)}</section>
 <section className="public-quote-details"><div><span>Promotion</span><strong>{f.promotion||"No promotion entered"}</strong></div><div><span>Equipment</span><strong>{money(f.equipmentFee)}</strong></div><div><span>Installation</span><strong>{money(f.installationFee)}</strong></div><div><span>Contract</span><strong>{f.contract}</strong></div></section>
 {quote.advisorNotes&&<section className="public-quote-note"><h3>Your advisor's note</h3><p>{quote.advisorNotes}</p></section>}
 {!ordered?<section className="public-quote-action"><h2>Ready to switch?</h2><p>Click below and ConnectIQ will begin the order process with this recommendation.</p><button onClick={order}>Click Here to Order</button><div><a href="/advisor"><MessageCircle size={16}/>Ask My AI Advisor</a><a href="tel:+18663911414"><Phone size={16}/>Call ConnectIQ</a></div></section>:<section className="public-quote-confirmed"><CheckCircle2 size={46}/><h2>We received your order request.</h2><p>A ConnectIQ advisor will verify the final details and contact you to complete the order.</p></section>}
 <footer>Availability, pricing, promotions, taxes, fees, equipment, and installation terms must be verified for the service address before the order is submitted.</footer></article></main>;
}
