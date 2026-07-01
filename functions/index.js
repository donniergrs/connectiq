import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "connectiq-functions" });
});

app.post("/api/fcc/lookup", async (req, res) => {
  try {
    const { street, city = "", state = "", zip = "" } = req.body;

    if (!street) {
      return res.status(400).json({
        error: "Address is required.",
      });
    }

    console.log("FCC lookup request received:", {
      street,
      city,
      state,
      zip,
    });

    const response = await fetch(
      `${process.env.FCC_API_BASE_URL}/listAsOfDates`,
      {
        headers: {
          username: process.env.FCC_USERNAME,
          hash_value: process.env.FCC_HASH_VALUE,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();

      return res.json({
        source: "mock",
        message: "FCC unauthorized or unavailable. Returned ConnectIQ fallback providers.",
        fccStatus: response.status,
        fccDetails: text,
        providers: MOCK_PROVIDERS,
      });
    }

    const data = await response.json();

    res.json({
      address: { street, city, state, zip },
      source: "fcc",
      raw: data,
      providers: [
        {
          id: "fcc-test",
          name: "FCC API Connected",
          technology: "Live API",
          download: 0,
          upload: 0,
        },
      ],
    });
  } catch (error) {
    console.error("FCC lookup error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`ConnectIQ backend running on port ${PORT}`);
});