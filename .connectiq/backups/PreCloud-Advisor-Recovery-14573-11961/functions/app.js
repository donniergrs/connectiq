import { listCatalogPlans, generateQuote, compareQuotePlans, saveQuote, getQuote, listQuoteVersions, selectQuotePlan } from "./services/quoteIQ/index.js";
// CONNECTIQ-AI-005A-IMPORT
import { evaluateRecommendations, runTestHarness, listRecommendationAudit, auditHealth, DEFAULT_RECOMMENDATION_CONFIG } from "./services/recommendationIntelligence/index.js";
// CONNECTIQ-AI-004C-IMPORT
import { buildAdvisorResponse, buildAdvisorQuote } from "./services/aiAdvisor/index.js";
import { universityHealth, listProviders, listArticles, upsertProvider, answerFromUniversity } from "./services/university/index.js";
import { orchestrateEnterpriseResponse } from "./services/enterprise/orchestrator.js";
import { resolveAdvisorMessage } from "./services/agentRuntime/responseResolver.js";
import { orchestrateSalesResponse } from "./services/salesOrchestrator/index.js";
import { evaluateSalesIntelligence } from "./services/salesIntelligence/index.js";
// CONNECTIQ-AI-004B-IMPORT
import {
  initializeToolRouter,
  routeConversationTurn,
  routerDiagnostics,
  routerHealth,
} from "./services/toolRouter/index.js";
initializeToolRouter();
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { lookupProviderIntelligence, providerIntelligenceStatus } from "./services/providerIntelligenceService.js";
import { createSalesBrainPlan } from "./services/salesBrainService.js";

import { buildDiscoveryPlan } from "./services/discoveryEngineService.js";
import { buildRecommendationStrategy } from "./services/recommendationObjectionService.js";
import { createConversationSession, getConversationSession, updateConversationSession, pauseConversationSession, resumeConversationSession, appendConversationEvent, listConversationEvents, runtimeSnapshot, SALES_STAGES } from "./services/conversationRuntimeService.js";
import { registerCustomerTwinRoutes } from "./services/customerTwin/routes.js";
import { registerSemanticUnderstandingRoutes } from "./services/semanticUnderstanding/routes.js";
dotenv.config({ path: process.env.CONNECTIQ_ENV_FILE || ".env.local" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 5001;


function getFccConfig() {
  return {
    username: process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME,
    hashValue: process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE,
    baseUrl: process.env.FCC_API_BASE_URL || process.env.VITE_FCC_API_BASE_URL || "https://broadbandmap.fcc.gov/api/public/map",
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readBody(response) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { text, json };
}

function safePreview(value, max = 900) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.slice(0, max);
}

function buildHeaders(style = "underscore") {
  const { username, hashValue } = getFccConfig();
  if (style === "dash") return { username, "hash-value": hashValue };
  if (style === "bearer") return { Authorization: `Bearer ${hashValue}`, username };
  return { username, hash_value: hashValue };
}

function normalizeTechnology(value) {
  const text = String(value || "").toLowerCase();
  if (["50", "fiber", "fiber to the premises", "fttp"].some((x) => text.includes(x))) return "Fiber";
  if (["40", "cable", "docsis"].some((x) => text.includes(x))) return "Cable";
  if (["71", "72", "70", "fixed wireless", "licensed fixed wireless", "unlicensed fixed wireless"].some((x) => text.includes(x))) return "Fixed Wireless";
  if (["10", "dsl", "copper"].some((x) => text.includes(x))) return "DSL";
  if (["60", "satellite"].some((x) => text.includes(x))) return "Satellite";
  return value || "Broadband";
}

function slugify(value) {
  return String(value || "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeProvider(raw, index = 0) {
  const props = raw?.properties || raw || {};
  const name =
    props.name || props.provider_name || props.brand_name || props.provider || props.business_name ||
    props.holding_company || props.frn_name || props.dbaname || props.dba_name || props.company || `Provider ${index + 1}`;

  const download = Number(
    props.max_download_mbps || props.max_advertised_download_speed || props.download || props.max_down || props.maxdown || props.downspeed || props.maxaddown || 0
  );
  const upload = Number(
    props.max_upload_mbps || props.max_advertised_upload_speed || props.upload || props.max_up || props.maxup || props.upspeed || props.maxadup || 0
  );

  return {
    id: String(props.id || props.provider_id || props.frn || props.holding_company_number || `${slugify(name)}-${index}`),
    name,
    technology: normalizeTechnology(props.technology || props.tech || props.technology_code || props.tech_code || props.category),
    download,
    upload,
    source: props.source || "fcc-explorer",
    raw,
  };
}

function extractProviderArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.providers)) return payload.providers;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.features)) return payload.features.map((f) => ({ ...(f.properties || {}), geometry: f.geometry }));
  if (payload.data && Array.isArray(payload.data.providers)) return payload.data.providers;
  if (payload.response && Array.isArray(payload.response.providers)) return payload.response.providers;
  return [];
}

function rankProviders(providers = []) {
  return providers
    .map((provider) => {
      let score = 45;
      if (provider.technology === "Fiber") score += 35;
      if (provider.technology === "Cable") score += 18;
      if (provider.technology === "Fixed Wireless") score += 8;
      if (provider.download >= 1000) score += 10;
      if (provider.upload >= 1000) score += 8;
      if (provider.upload >= provider.download * 0.75 && provider.upload > 0) score += 4;
      return { ...provider, score: Math.min(100, Math.round(score)) };
    })
    .sort((a, b) => b.score - a.score || b.download - a.download || b.upload - a.upload);
}

async function geocodeAddress(address) {
  const query = encodeURIComponent(address);
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${query}&benchmark=Public_AR_Current&format=json`;
  const response = await fetchWithTimeout(url, {}, 20000);
  if (!response.ok) throw new Error(`Census geocoder failed with ${response.status}`);
  const data = await response.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    matchedAddress: match.matchedAddress,
    latitude: match.coordinates?.y ?? null,
    longitude: match.coordinates?.x ?? null,
    tigerLineId: match.tigerLine?.tigerLineId || null,
    addressComponents: match.addressComponents || {},
    raw: match,
  };
}

async function getFccAsOfDates(timeoutMs = 20000) {
  const { baseUrl } = getFccConfig();
  const response = await fetchWithTimeout(`${baseUrl}/listAsOfDates`, { method: "GET", headers: buildHeaders("underscore") }, timeoutMs);
  const body = await readBody(response);
  return { ok: response.ok, status: response.status, data: body.json, preview: safePreview(body.json || body.text) };
}

function buildCandidateUrls({ lat, lon, address, asOfDate }) {
  const encodedAddress = encodeURIComponent(address || "");
  const date = encodeURIComponent(asOfDate || "");
  return [
    // Confirmed authenticated family is /api/public/map. These endpoint names are intentionally tested safely.
    `https://broadbandmap.fcc.gov/api/public/map/fixed?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/fixedAvailability?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/location?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/availability?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/provider?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/providers?latitude=${lat}&longitude=${lon}&as_of_date=${date}`,

    // NBM frontend API candidates used by the public map application.
    `https://broadbandmap.fcc.gov/nbm/map/api/location/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/broadband/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/fixed/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/provider/availability?latitude=${lat}&longitude=${lon}`,
    `https://broadbandmap.fcc.gov/nbm/map/api/providers?latitude=${lat}&longitude=${lon}`,

    // Address variants, in case endpoint accepts plain address.
    `https://broadbandmap.fcc.gov/api/public/map/location?address=${encodedAddress}&as_of_date=${date}`,
    `https://broadbandmap.fcc.gov/api/public/map/availability?address=${encodedAddress}&as_of_date=${date}`,
  ];
}

async function testCandidate(url, index) {
  const headerStyles = ["underscore", "dash"];
  const attempts = [];

  for (const style of headerStyles) {
    try {
      const response = await fetchWithTimeout(url, { method: "GET", headers: buildHeaders(style) }, 8500);
      const body = await readBody(response);
      const rows = extractProviderArray(body.json);
      const providers = rows.map((row, rowIndex) => normalizeProvider(row, rowIndex));
      attempts.push({
        index,
        authStyle: style,
        url,
        ok: response.ok,
        status: response.status,
        providerCount: providers.length,
        providers: rankProviders(providers),
        preview: safePreview(body.json || body.text, 1200),
      });
      if (response.ok && providers.length) break;
    } catch (error) {
      attempts.push({ index, authStyle: style, url, ok: false, error: error.name === "AbortError" ? "Timed out" : error.message });
    }
  }

  return attempts;
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "connectiq-functions" }));
app.get("/api/conversations/health", (req, res) => res.json({ ok: true, service: "connectiq-conversation-runtime", stages: SALES_STAGES }));
app.post("/api/conversations/sessions", (req, res) => { try { res.status(201).json({ ok: true, session: createConversationSession(req.body || {}) }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });
app.get("/api/conversations/sessions/:sessionId", (req, res) => { const session = getConversationSession(req.params.sessionId); if (!session) return res.status(404).json({ ok: false, error: "Conversation session not found." }); res.json({ ok: true, session }); });
app.patch("/api/conversations/sessions/:sessionId", (req, res) => { try { res.json({ ok: true, session: updateConversationSession(req.params.sessionId, req.body || {}) }); } catch (error) { res.status(error.message.includes("not found") ? 404 : 400).json({ ok: false, error: error.message }); } });
app.post("/api/conversations/sessions/:sessionId/pause", (req, res) => { try { res.json({ ok: true, session: pauseConversationSession(req.params.sessionId) }); } catch (error) { res.status(404).json({ ok: false, error: error.message }); } });
app.post("/api/conversations/sessions/:sessionId/resume", (req, res) => { try { res.json({ ok: true, session: resumeConversationSession(req.params.sessionId) }); } catch (error) { res.status(404).json({ ok: false, error: error.message }); } });
app.post("/api/conversations/sessions/:sessionId/events", (req, res) => { try { res.status(201).json({ ok: true, event: appendConversationEvent(req.params.sessionId, req.body || {}) }); } catch (error) { res.status(404).json({ ok: false, error: error.message }); } });
app.get("/api/conversations/sessions/:sessionId/events", (req, res) => { const session = getConversationSession(req.params.sessionId); if (!session) return res.status(404).json({ ok: false, error: "Conversation session not found." }); res.json({ ok: true, events: listConversationEvents(req.params.sessionId) }); });
app.get("/api/conversations/sessions/:sessionId/snapshot", (req, res) => { const snapshot = runtimeSnapshot(req.params.sessionId); if (!snapshot) return res.status(404).json({ ok: false, error: "Conversation session not found." }); res.json({ ok: true, ...snapshot }); });


// AI-016: FCC diagnostic and explorer routes removed. Provider discovery is OpenAI-only.

app.get("/api/ai-sales/recommendation/health", (req, res) => {
  res.json({ ok: true, service: "connectiq-recommendation-objection", version: "recommendation-objection-v1.0" });
});

app.post("/api/ai-sales/recommendation/strategy", (req, res) => {
  try { return res.json({ ok: true, ...buildRecommendationStrategy(req.body?.lead || req.body || {}) }); }
  catch (error) { return res.status(400).json({ ok: false, error: error.message || "Unable to build recommendation strategy." }); }
});

app.post("/api/ai-sales/recommendation/respond", (req, res) => {
  try {
    const strategy = buildRecommendationStrategy(req.body?.lead || {});
    const requested = String(req.body?.objection || "").trim().toLowerCase();
    const match = strategy.objections.find((item) => requested.includes(item.key) || item.examples.some((example) => requested.includes(example.toLowerCase())));
    return res.json({ ok: true, strategy, response: match || strategy.primaryObjection });
  } catch (error) { return res.status(400).json({ ok: false, error: error.message || "Unable to respond to objection." }); }
});

app.get("/api/ai-sales/discovery/health", (req, res) => {
  res.json({ ok: true, service: "connectiq-sales-discovery", version: "discovery-engine-v1.0" });
});

app.post("/api/ai-sales/discovery/plan", (req, res) => {
  try { return res.json({ ok: true, ...buildDiscoveryPlan(req.body?.lead || req.body || {}) }); }
  catch (error) { return res.status(400).json({ ok: false, error: error.message || "Unable to build discovery plan." }); }
});

app.post("/api/ai-sales/discovery/next", (req, res) => {
  try {
    const plan = buildDiscoveryPlan(req.body?.lead || {});
    return res.json({ ok: true, conversationId: req.body?.conversationId || `cq-${Date.now()}`, version: plan.version, completionPercent: plan.completionPercent, next: plan.next, scoring: plan.scoring, complete: plan.complete, summary: plan.summary });
  } catch (error) { return res.status(400).json({ ok: false, error: error.message || "Unable to continue discovery." }); }
});

app.get("/api/ai-sales/health", (req, res) => {
  res.json({ ok: true, service: "connectiq-sales-brain", version: "sales-brain-v1.0" });
});

app.post("/api/ai-sales/plan", (req, res) => {
  try {
    return res.json(createSalesBrainPlan(req.body?.lead || req.body || {}));
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || "Unable to create sales plan." });
  }
});

app.post("/api/ai-sales/conversation/next", (req, res) => {
  try {
    const plan = createSalesBrainPlan(req.body?.lead || {});
    return res.json({
      ok: true,
      conversationId: req.body?.conversationId || `cq-${Date.now()}`,
      stage: plan.stage,
      opening: plan.opening,
      nextQuestion: plan.nextQuestion,
      nextAction: plan.nextAction,
      missing: plan.missing,
      dispositions: plan.dispositions,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || "Unable to continue conversation." });
  }
});

app.get("/api/provider-intelligence/status", (req, res) => {
  res.json({ ok: true, ...providerIntelligenceStatus() });
});

app.post("/api/provider-intelligence/lookup", async (req, res) => {
  const address = req.body?.address || req.body?.street || req.body?.full || "";
  if (!address.trim()) return res.status(400).json({ ok: false, error: "Address is required.", providers: [], aiCandidates: [] });
  try {
    const result = await lookupProviderIntelligence(address, {
      refresh: req.body?.refresh === true,
      includeAiResearch: req.body?.includeAiResearch !== false,
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      source: "provider-intelligence-error",
      address,
      status: "failed",
      providerCount: 0,
      providers: [],
      aiCandidates: [],
      recommendationEligible: false,
      verificationRequired: true,
      error: error.message || "Provider intelligence lookup failed.",
    });
  }
});

// AI-016: legacy /api/fcc/lookup route removed. Use /api/provider-intelligence/lookup.

// CONNECTIQ-AI-005A-ROUTES
app.get("/api/recommendations/health", (req, res) => res.json({ ok: true, service: "connectiq-recommendation-intelligence", version: "AI-005A-v1.0.0", weights: DEFAULT_RECOMMENDATION_CONFIG.weights, audit: auditHealth() }));
app.get("/api/recommendations/config", (req, res) => res.json({ ok: true, config: DEFAULT_RECOMMENDATION_CONFIG }));
app.post("/api/recommendations/evaluate", (req, res) => { try { res.json(evaluateRecommendations(req.body || {})); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });
app.post("/api/recommendations/test-harness", (req, res) => { try { res.json({ ok: true, scenarios: runTestHarness() }); } catch (error) { res.status(500).json({ ok: false, error: error.message }); } });
app.get("/api/recommendations/audit", (req, res) => res.json({ ok: true, records: listRecommendationAudit({ limit: req.query.limit }) }));


// CONNECTIQ-M4A-QUOTEIQ-ROUTES
app.get("/api/quotes/health", (req,res) => res.json({ ok:true, service:"QuoteIQ", version:"4A-1.0.0", weights:{ businessValue:0.6, customerFit:0.4 } }));
app.get("/api/providerPlans", (req,res) => res.json({ ok:true, plans:listCatalogPlans({ providerIds:String(req.query.providerIds||"").split(",").filter(Boolean) }) }));
app.post("/api/quotes/create", (req,res) => { try { const quote=saveQuote(generateQuote(req.body||{})); res.status(201).json(quote); } catch(error){ res.status(400).json({ok:false,error:error.message}); } });
app.get("/api/quotes/:quoteId", (req,res) => { const quote=getQuote(req.params.quoteId); if(!quote) return res.status(404).json({ok:false,error:"Quote not found."}); res.json(quote); });
app.get("/api/quotes/:quoteId/versions", (req,res) => res.json({ok:true,quoteId:req.params.quoteId,versions:listQuoteVersions(req.params.quoteId)}));
app.post("/api/quotes/:quoteId/compare", (req,res) => { const quote=getQuote(req.params.quoteId); if(!quote) return res.status(404).json({ok:false,error:"Quote not found."}); res.json(compareQuotePlans(quote,req.body?.planIds||[])); });
app.post("/api/quotes/:quoteId/select", (req,res) => { try { res.json(selectQuotePlan(req.params.quoteId,req.body?.planId)); } catch(error){ res.status(error.message.includes("not found")?404:400).json({ok:false,error:error.message}); } });



// CONNECTIQ-AI-004B-ROUTES
app.get("/api/conversations/router/health", (req, res) => {
  res.json(routerHealth());
});

app.post("/api/conversations/router/turn", async (req, res) => {
  try {
    const result = await routeConversationTurn(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.get("/api/conversations/router/diagnostics", (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
  res.json(routerDiagnostics({ sessionId: req.query.sessionId || "", limit }));
});

// CONNECTIQ-AI-004C-ROUTES
app.get("/api/conversations/advisor/health", (req, res) => {
  res.json({ ok: true, service: "connectiq-sales-closer-conversation-engine", version: "Sales-Brain-v2.0.0", mode: "agentic_consultative_sales" });
});

app.post("/api/conversations/advisor/turn", async (req, res) => {
  try {
    const providers = Array.isArray(req.body?.providers) ? req.body.providers : [];
    const conversationHistory = Array.isArray(req.body?.conversationHistory) ? req.body.conversationHistory : [];
    const previousAdvisorMessage = [...conversationHistory].reverse().find((item) => item?.role === "advisor")?.text || "";
    const routerResult = await routeConversationTurn({
      ...(req.body || {}),
      context: {
        ...(req.body?.context || {}),
        providers,
        quote: req.body?.quote || null,
        clientMemory: req.body?.memory || null,
        conversationHistory,
      },
    });
    const salesDecision = orchestrateSalesResponse({
      message: req.body?.message || "",
      memory: routerResult.memory || {},
      providers,
      quote: req.body?.quote || null,
    });
    routerResult.memory = {
      ...(routerResult.memory || {}),
      selectedProvider: salesDecision.selectedProviderName || routerResult?.memory?.selectedProvider || null,
      stage: salesDecision.stage,
      status: salesDecision.stage === "COMPLETED" ? "completed" : "active",
      completedAt: salesDecision.stage === "COMPLETED" ? new Date().toISOString() : null,
      lastNextAction: salesDecision.nextAction,
    };
    routerResult.stage = salesDecision.stage;
    routerResult.response = {
      ...(routerResult.response || {}),
      message: salesDecision.message,
      nextAction: salesDecision.nextAction,
    };
    const quote = buildAdvisorQuote({
      routerResult,
      providers,
      selectedProvider: salesDecision.selectedProvider || req.body?.selectedProvider || null,
    });
    const legacyAdvisor = buildAdvisorResponse({ routerResult, providers, quote });
    const salesIntelligence = evaluateSalesIntelligence({ message: req.body?.message, memory: routerResult.memory, quote });
    const enterprise = orchestrateEnterpriseResponse({ message: req.body?.message, routerResult, providers, selectedProvider: salesDecision.selectedProvider || req.body?.selectedProvider });
    const advisor = {
      ...legacyAdvisor,
      message: resolveAdvisorMessage({
        routerResult,
        latestMessage: req.body?.message || "",
        previousAdvisorMessage,
        quote,
        providers,
        salesDecision,
      }),
      suggestedReplies: salesDecision.suggestedReplies || legacyAdvisor.suggestedReplies || [],
      selectedProvider: salesDecision.selectedProviderName || routerResult?.memory?.selectedProvider || enterprise.selectedProvider || legacyAdvisor.selectedProvider || null,
      stage: salesDecision.stage,
      enterprise,
      agent: routerResult?.agent || null,
      conversationMode: "agentic_consultative_sales",
    };
    res.json({ ...routerResult, salesIntelligence, advisor, quote, enterprise, salesDecision, conversationMode: "agentic_consultative_sales" });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});


// CONNECTIQ-ENTERPRISE-V2-UNIVERSITY
app.get("/api/university/health", (req, res) => res.json(universityHealth()));
app.get("/api/university/providers", (req, res) => res.json({ ok: true, providers: listProviders({ query: req.query.q || "" }) }));
app.get("/api/university/articles", (req, res) => res.json({ ok: true, articles: listArticles({ query: req.query.q || "", type: req.query.type || "" }) }));
app.post("/api/university/answer", (req, res) => { try { res.json({ ok: true, ...answerFromUniversity(req.body || {}) }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });
app.put("/api/university/providers/:providerId", (req, res) => { try { res.json({ ok: true, provider: upsertProvider({ ...(req.body || {}), id: req.params.providerId }) }); } catch (error) { res.status(400).json({ ok: false, error: error.message }); } });

app.get("/api/conversations/advisor/sessions", (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
  res.json(routerDiagnostics({ sessionId: req.query.sessionId || "", limit }));
});



registerCustomerTwinRoutes(app, null);



registerSemanticUnderstandingRoutes(app, null);

export { app };

export function startLocalServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`ConnectIQ backend running on port ${port}`);
  });
}
