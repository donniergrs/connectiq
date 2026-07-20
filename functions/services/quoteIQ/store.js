const quotes=new Map(); const versions=new Map();
const clone=v=>JSON.parse(JSON.stringify(v));
export function saveQuote(quote){ quotes.set(quote.quoteId,clone(quote)); const history=versions.get(quote.quoteId)||[]; history.push(clone(quote)); versions.set(quote.quoteId,history); return clone(quote); }
export function getQuote(id){ const q=quotes.get(id); return q?clone(q):null; }
export function listQuoteVersions(id){ return clone(versions.get(id)||[]); }
export function selectQuotePlan(id,planId){ const q=quotes.get(id); if(!q) throw new Error("Quote not found."); const selected=q.plans.find(p=>p.planId===planId); if(!selected) throw new Error("Plan not found on quote."); const updated={...q,selectedPlan:selected,status:"PLAN_SELECTED",pipelineStage:"Quote Ready",version:q.version+1,updatedAt:new Date().toISOString()}; return saveQuote(updated); }
