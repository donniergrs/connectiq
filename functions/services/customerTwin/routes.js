import { CustomerTwinService } from "./service.js";

export function registerCustomerTwinRoutes(app, db = null) {
  if (!app?.get || !app?.post || !app?.patch) {
    throw new Error("registerCustomerTwinRoutes requires an Express-compatible app.");
  }

  const service = new CustomerTwinService({ db });

  app.get("/api/customer-twins/health", (_req, res) => {
    res.json({
      ok: true,
      service: "connectiq-customer-digital-twin",
      version: "CCE-001-v1.0.0",
      persistence: db ? "firestore" : "memory-fallback",
    });
  });

  app.post("/api/customer-twins", async (req, res) => {
    try {
      const twin = await service.create(req.body || {});
      res.status(201).json({ ok: true, twin });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/customer-twins/:customerId", async (req, res) => {
    try {
      const twin = await service.get(req.params.customerId);
      if (!twin) return res.status(404).json({ ok: false, error: "Customer twin not found." });
      return res.json({ ok: true, twin });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.patch("/api/customer-twins/:customerId/facts", async (req, res) => {
    try {
      const result = await service.updateFacts({
        customerId: req.params.customerId,
        ...(req.body || {}),
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/customer-twins/:customerId/history", async (req, res) => {
    try {
      const events = await service.history(req.params.customerId, req.query.limit);
      res.json({ ok: true, events });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });
}
