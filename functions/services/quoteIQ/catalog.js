export const PROVIDER_PLAN_CATALOG = Object.freeze([
  { providerId:"att", providerName:"AT&T Fiber", planId:"att-fiber-300", planName:"Fiber 300", technology:"FTTP", downloadMbps:300, uploadMbps:300, monthlyPrice:55, promoMonths:12, equipmentFee:0, installationFee:0, contractMonths:0, commission:{ amount:125, type:"one_time", verified:false }, active:true },
  { providerId:"att", providerName:"AT&T Fiber", planId:"att-fiber-1000", planName:"Fiber 1 Gig", technology:"FTTP", downloadMbps:1000, uploadMbps:1000, monthlyPrice:80, promoMonths:12, equipmentFee:0, installationFee:0, contractMonths:0, commission:{ amount:175, type:"one_time", verified:false }, active:true },
  { providerId:"spectrum", providerName:"Spectrum", planId:"spectrum-500", planName:"Internet Premier", technology:"Cable", downloadMbps:500, uploadMbps:20, monthlyPrice:70, promoMonths:12, equipmentFee:0, installationFee:30, contractMonths:0, commission:{ amount:140, type:"one_time", verified:false }, active:true },
  { providerId:"spectrum", providerName:"Spectrum", planId:"spectrum-1000", planName:"Internet Gig", technology:"Cable", downloadMbps:1000, uploadMbps:35, monthlyPrice:100, promoMonths:12, equipmentFee:0, installationFee:30, contractMonths:0, commission:{ amount:180, type:"one_time", verified:false }, active:true },
  { providerId:"frontier", providerName:"Frontier Fiber", planId:"frontier-500", planName:"Fiber 500", technology:"FTTP", downloadMbps:500, uploadMbps:500, monthlyPrice:60, promoMonths:12, equipmentFee:0, installationFee:0, contractMonths:0, commission:{ amount:150, type:"one_time", verified:false }, active:true },
  { providerId:"frontier", providerName:"Frontier Fiber", planId:"frontier-1000", planName:"Fiber 1 Gig", technology:"FTTP", downloadMbps:1000, uploadMbps:1000, monthlyPrice:75, promoMonths:12, equipmentFee:0, installationFee:0, contractMonths:0, commission:{ amount:190, type:"one_time", verified:false }, active:true }
]);

export function listCatalogPlans({ providerIds = [], activeOnly = true } = {}) {
  const allowed = new Set(providerIds.map(v => String(v).toLowerCase()));
  return PROVIDER_PLAN_CATALOG.filter(plan => (!activeOnly || plan.active) && (!allowed.size || allowed.has(plan.providerId)));
}
