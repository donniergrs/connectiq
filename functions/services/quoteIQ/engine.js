import crypto from "node:crypto";
import { listCatalogPlans } from "./catalog.js";

const round = n => Math.round(Number(n || 0) * 100) / 100;
const norm = v => String(v || "").trim().toLowerCase();
function id(prefix){ return `${prefix}_${crypto.randomUUID()}`; }
function clamp(n,min=0,max=100){ return Math.max(min,Math.min(max,n)); }

export function scoreCustomerFit(plan, customer = {}) {
  let score = 45;
  const needs = new Set((customer.needs || customer.householdNeeds || []).map(norm));
  const pains = new Set((customer.painPoints || []).map(norm));
  const bill = Number(customer.monthlyBill || customer.currentMonthlyBill || 0);
  const budget = Number(customer.budget || customer.targetMonthlyPrice || 0);
  const effective = Number(plan.monthlyPrice) + Number(plan.equipmentFee || 0);
  if (needs.has("workfromhome") || needs.has("work from home")) score += plan.uploadMbps >= 300 ? 16 : plan.uploadMbps >= 20 ? 7 : -8;
  if (needs.has("gaming")) score += plan.downloadMbps >= 500 ? 10 : 4;
  if (needs.has("streaming")) score += plan.downloadMbps >= 300 ? 8 : 3;
  if (pains.has("reliability")) score += plan.technology === "FTTP" ? 15 : 3;
  if (bill > 0) score += effective < bill ? Math.min(15, (bill-effective)/2) : -Math.min(12, (effective-bill)/3);
  if (budget > 0) score += effective <= budget ? 10 : -Math.min(18, (effective-budget)/2);
  if (plan.contractMonths === 0) score += 4;
  return round(clamp(score));
}

export function scoreBusinessValue(plan, plans = []) {
  const commissions = plans.map(p => Number(p.commission?.amount || 0));
  const max = Math.max(...commissions, 1), min = Math.min(...commissions, 0);
  const c = Number(plan.commission?.amount || 0);
  const normalizedCommission = max === min ? 50 : ((c-min)/(max-min))*100;
  const completeness = [plan.monthlyPrice,plan.downloadMbps,plan.uploadMbps,plan.providerName,plan.planName].filter(v => v !== undefined && v !== null && v !== "").length / 5 * 100;
  return round(clamp(normalizedCommission*0.85 + completeness*0.15));
}

function reasons(plan, customer, fit) {
  const result=[]; const bill=Number(customer.monthlyBill || customer.currentMonthlyBill || 0); const effective=Number(plan.monthlyPrice)+Number(plan.equipmentFee||0);
  if (bill && effective < bill) result.push(`Estimated savings of $${round(bill-effective)} per month`);
  if (plan.technology === "FTTP") result.push("Fiber connection with strong upload performance");
  if (plan.uploadMbps >= 300) result.push("Well suited for working from home and video calls");
  if (plan.contractMonths === 0) result.push("No annual contract listed");
  if (!result.length) result.push(`Customer-fit score of ${fit}`);
  return result.slice(0,4);
}

export function generateQuote(input = {}) {
  const customer=input.customer || {}; const current=norm(customer.currentProvider);
  let plans = input.plans?.length ? input.plans : listCatalogPlans({ providerIds: input.availableProviderIds || [] });
  plans = plans.filter(p => p.active !== false);
  const alternatives = plans.filter(p => !current || !norm(p.providerName).includes(current) && !current.includes(norm(p.providerName)));
  if (alternatives.length) plans = alternatives;
  if (!plans.length) throw new Error("No eligible plans are available for this quote.");
  const ranked = plans.map(plan => {
    const customerFitScore=scoreCustomerFit(plan,customer); const businessValueScore=scoreBusinessValue(plan,plans);
    const overallScore=round(businessValueScore*0.6 + customerFitScore*0.4);
    const effectiveMonthlyPrice=round(Number(plan.monthlyPrice)+Number(plan.equipmentFee||0));
    return {...plan,effectiveMonthlyPrice,customerFitScore,businessValueScore,overallScore,reasons:reasons(plan,customer,customerFitScore),estimatedMonthlySavings: customer.monthlyBill ? round(Number(customer.monthlyBill)-effectiveMonthlyPrice) : null};
  }).sort((a,b)=>b.overallScore-a.overallScore || a.effectiveMonthlyPrice-b.effectiveMonthlyPrice);
  const createdAt=new Date().toISOString();
  return { ok:true, quoteId:input.quoteId || id("qt"), quoteNumber:input.quoteNumber || `CIQ-${Date.now().toString(36).toUpperCase()}`, version:Number(input.version||1), status:"QUOTE_READY", pipelineStage:"Quote Ready", leadId:input.leadId||null, customer, recommendation:ranked[0], alternatives:ranked.slice(1,4), plans:ranked, ranking:{businessValueWeight:0.6,customerFitWeight:0.4}, disclosures:["Availability, pricing, promotions, taxes, fees, and installation terms must be verified for the service address before ordering.","Commission values marked unverified are planning inputs and must not be presented to customers."], createdAt,updatedAt:createdAt };
}

export function compareQuotePlans(quote, planIds = []) {
  const wanted=new Set(planIds); const plans=(quote?.plans||[]).filter(p=>!wanted.size||wanted.has(p.planId));
  return { ok:true, quoteId:quote?.quoteId, comparison:plans.map(p=>({planId:p.planId,providerName:p.providerName,planName:p.planName,effectiveMonthlyPrice:p.effectiveMonthlyPrice,downloadMbps:p.downloadMbps,uploadMbps:p.uploadMbps,technology:p.technology,overallScore:p.overallScore,customerFitScore:p.customerFitScore,contractMonths:p.contractMonths,installationFee:p.installationFee})) };
}
