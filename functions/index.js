import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

const MOCK_PROVIDERS = [
  { id: "lumos", name: "Lumos Fiber", technology: "Fiber", download: 5000, upload: 5000 },
  { id: "att", name: "AT&T Fiber", technology: "Fiber", download: 5000, upload: 5000 },
  { id: "spectrum", name: "Spectrum", technology: "Cable", download: 1000, upload: 40 },
];

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "connectiq-functions" });
});

app.post("/api/fcc/lookup", async (req, res) => {
  const { street, city = "", state = "", zip = "" } = req.body || {};

  console.log("FCC lookup request received:", { street, city, state, zip });

  if (!street) {
    return res.json({
      source: "mock",
      message: "No address provided. Returned ConnectIQ fallback providers.",
      providers: MOCK_PROVIDERS,
    });
  }

  try {
    const username = process.env.FCC_USERNAME || process.env.VITE_FCC_USERNAME;
    const hashValue = process.env.FCC_HASH_VALUE || process.env.VITE_FCC_HASH_VALUE;
    const baseUrl =
      process.env.FCC_API_BASE_URL ||
      process.env.VITE_FCC_API_BASE_URL ||
      "https://broadbandmap.fcc.gov/api/public/map";

    if (!username || !hashValue) {
      return res.json({
        source: "mock",
        message: "FCC credentials missing. Returned ConnectIQ fallback providers.",
        providers: MOCK_PROVIDERS,
      });
    }

    const response = await fetch(`${baseUrl}/listAsOfDates`, {
      method: "GET",
      headers: {
        username,
        hash_value: hashValue,
      },
    });

    if (!response.ok) {
      const details = await response.text();

      console.warn("FCC API unavailable:", response.status, details);

      return res.json({
        source: "mock",
        message: "FCC unavailable. Returned ConnectIQ fallback providers.",
        fccStatus: response.status,
        providers: MOCK_PROVIDERS,
      });
    }

    return res.json({
      source: "fcc-connected",
      message: "FCC API connection successful. Provider mapping is next.",
      providers: MOCK_PROVIDERS,
    });
  } catch (error) {
    console.warn("FCC lookup failed:", error.message);

    return res.json({
      source: "mock",
      message: "FCC lookup failed. Returned ConnectIQ fallback providers.",
      providers: MOCK_PROVIDERS,
    });
  }
});

app.listen(PORT, () => {
  console.log(`ConnectIQ backend running on port ${PORT}`);
});
