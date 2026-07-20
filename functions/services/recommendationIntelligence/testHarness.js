import { evaluateRecommendations } from "./engine.js";
export const TEST_SCENARIOS = [
  {
    id: "remote-worker-fiber-vs-cable",
    description: "Remote worker comparing profitable cable with higher-fit fiber.",
    customerProfile: { workFromHome: true, heavyStreaming: true, minimumDownloadMbps: 300, minimumUploadMbps: 50, budget: 140 },
    providers: [
      { name: "FiberCo", technology: "Fiber", downloadMbps: 1000, uploadMbps: 1000, lowLatency: true, monthlyPrice: 90, economics: { oneTimeCommission: 180, spiff: 50, installSuccessRate: .92 } },
      { name: "CableCo", technology: "Cable", downloadMbps: 1000, uploadMbps: 35, lowLatency: true, monthlyPrice: 80, economics: { oneTimeCommission: 350, spiff: 200, installSuccessRate: .95 } },
    ],
  },
  {
    id: "rural-terrestrial-vs-satellite",
    description: "Rural household should prefer an eligible terrestrial option over satellite when fit remains acceptable.",
    customerProfile: { heavyStreaming: true, minimumDownloadMbps: 100, budget: 120 },
    providers: [
      { name: "FixedNet", technology: "Licensed Fixed Wireless", downloadMbps: 300, uploadMbps: 50, lowLatency: true, monthlyPrice: 75, economics: { oneTimeCommission: 160, spiff: 100 } },
      { name: "SatNet", technology: "Satellite", downloadMbps: 150, uploadMbps: 10, monthlyPrice: 100, economics: { oneTimeCommission: 400, spiff: 250 } },
    ],
  },
];
export function runTestHarness() { return TEST_SCENARIOS.map(s=>({ id:s.id, description:s.description, result:evaluateRecommendations({...s, context:{source:"test-harness",scenarioId:s.id}}) })); }
