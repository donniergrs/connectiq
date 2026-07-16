import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  fetchWithTimeout,
  getFccRuntimeConfig,
  lookupLiveFccProviders,
  testFccAuth,
} from "./services/liveFccService.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 5001;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "connectiq-functions" });
});

app.get("/api/fcc/diagnostic", async (req, res) => {
  try {
    const diagnostic = await testFccAuth();
    res.json(diagnostic);
  } catch (error) {
    res.json({
      ok: false,
      error: error.name === "AbortError" ? "The operation was aborted." : error.message,
      ...getFccRuntimeConfig(),
      hashValue: undefined,
    });
  }
});

app.post("/api/fcc/lookup", async (req, res) => {
  const address = req.body?.address || req.body?.street || req.body?.full || "";

  try {
    const data = await lookupLiveFccProviders(address);
    return res.json(data);
  } catch (error) {
    console.error("Live FCC lookup failed:", error);
    return res.status(500).json({
      ok: false,
      success: false,
      source: "fcc-live-fabric",
      message: error.message || "Live FCC lookup failed.",
      address,
      providers: [],
    });
  }
});

// Compatibility route used by the Sprint 12 explorer page.
app.post("/api/fcc/explore", async (req, res) => {
  const address = req.body?.address || req.body?.street || req.body?.full || "";

  try {
    const data = await lookupLiveFccProviders(address);
    return res.json({
      ...data,
      attempts: [
        {
          ok: true,
          status: 200,
          authStyle: "FCC web fabric API",
          providerCount: data.providers?.length || 0,
          url: "https://broadbandmap.fcc.gov/nbm/map/api/fabric/address/{fabricId}/{address} → /detail/{fabricId}/{locationId}",
          preview: JSON.stringify(data.providers || []).slice(0, 1200),
        },
      ],
      best: {
        ok: true,
        providerCount: data.providers?.length || 0,
        providers: data.providers || [],
      },
    });
  } catch (error) {
    return res.json({
      ok: false,
      source: "fcc-live-fabric",
      error: error.message,
      providers: [],
      attempts: [],
    });
  }
});

// Compatibility route for older Sprint 12B diagnostics.
app.post("/api/fcc/method-explorer", async (req, res) => {
  const address = req.body?.address || "101 plum creek ln greenville sc 29607";
  try {
    const data = await lookupLiveFccProviders(address);
    return res.json({
      ok: true,
      address,
      geocode: data.location,
      tested: 2,
      results: [
        {
          base: "https://broadbandmap.fcc.gov/nbm/map/api/fabric",
          endpoint: "/address/{fabricId}/{address}",
          method: "GET",
          status: 200,
          ok: true,
          providerCount: data.providers?.length || 0,
          preview: JSON.stringify(data.addressCandidates || []).slice(0, 500),
        },
        {
          base: "https://broadbandmap.fcc.gov/nbm/map/api/fabric",
          endpoint: "/detail/{fabricId}/{locationId}",
          method: "GET",
          status: 200,
          ok: true,
          providerCount: data.providers?.length || 0,
          preview: JSON.stringify(data.providers || []).slice(0, 500),
        },
      ],
    });
  } catch (error) {
    return res.json({ ok: false, error: error.message });
  }
});

app.get("/api/fcc/raw-detail/:fabricId/:locationId", async (req, res) => {
  const { fabricId, locationId } = req.params;
  const vintage = req.query.fabric_vintage || process.env.FCC_FABRIC_VINTAGE || "2025-12-31";
  const url = `https://broadbandmap.fcc.gov/nbm/map/api/fabric/detail/${fabricId}/${locationId}?fabric_vintage=${encodeURIComponent(vintage)}`;

  try {
    const response = await fetchWithTimeout(url, { method: "GET" }, 15000);
    const text = await response.text();
    res.status(response.status).type(response.headers.get("content-type") || "application/json").send(text);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ConnectIQ backend running on port ${PORT}`);
});
