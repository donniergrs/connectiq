import { SemanticUnderstandingService } from "./service.js";
import { SEMANTIC_ENGINE_VERSION } from "./constants.js";

export function registerSemanticUnderstandingRoutes(app, db = null) {
  if (!app?.get || !app?.post) {
    throw new Error("registerSemanticUnderstandingRoutes requires an Express-compatible app.");
  }

  const service = new SemanticUnderstandingService({ db });

  app.get("/api/semantic-understanding/health", (_req, res) => {
    res.json({
      ok: true,
      service: "connectiq-semantic-understanding",
      version: SEMANTIC_ENGINE_VERSION,
      capabilities: [
        "intent-classification",
        "fact-extraction",
        "sentiment-and-urgency",
        "contradiction-detection",
        "next-best-question",
        "customer-twin-update",
      ],
    });
  });

  app.post("/api/semantic-understanding/analyze", async (req, res) => {
    try {
      const analysis = await service.analyze(req.body || {});
      res.json({ ok: true, analysis });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/semantic-understanding/process", async (req, res) => {
    try {
      const result = await service.process(req.body || {});
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });
}
