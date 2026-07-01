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

  try {
    return res.json({
      source: "fallback",
      message: "Using ConnectIQ fallback providers while FCC live lookup is finalized.",
      providers: MOCK_PROVIDERS,
    });
  } catch (error) {
    return res.json({
      source: "fallback",
      message: "Fallback providers returned.",
      providers: MOCK_PROVIDERS,
    });
  }
});

app.listen(PORT, () => {
  console.log(`ConnectIQ backend running on port ${PORT}`);
});
