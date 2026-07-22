import { onRequest } from "firebase-functions/v2/https";
import { app } from "./app.js";

export const api = onRequest(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
    concurrency: 20,
    minInstances: 0,
    maxInstances: 10,
    secrets: ["OPENAI_API_KEY"],
  },
  app,
);
