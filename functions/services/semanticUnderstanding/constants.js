export const SEMANTIC_ENGINE_VERSION = "CCE-002-v1.0.0";

export const INTENTS = Object.freeze({
  FIND_PROVIDER: "FIND_PROVIDER",
  COMPARE_PROVIDERS: "COMPARE_PROVIDERS",
  LOWER_BILL: "LOWER_BILL",
  IMPROVE_RELIABILITY: "IMPROVE_RELIABILITY",
  IMPROVE_SPEED: "IMPROVE_SPEED",
  RESOLVE_OUTAGE: "RESOLVE_OUTAGE",
  IMPROVE_WIFI: "IMPROVE_WIFI",
  SUPPORT_REMOTE_WORK: "SUPPORT_REMOTE_WORK",
  SUPPORT_GAMING: "SUPPORT_GAMING",
  SUPPORT_STREAMING: "SUPPORT_STREAMING",
  MOVE_SERVICE: "MOVE_SERVICE",
  SWITCH_PROVIDER: "SWITCH_PROVIDER",
  BUY_NOW: "BUY_NOW",
  ASK_QUESTION: "ASK_QUESTION",
  PROVIDE_INFORMATION: "PROVIDE_INFORMATION",
  UNKNOWN: "UNKNOWN",
});

export const FACT_SOURCE = Object.freeze({
  EXPLICIT: "explicit",
  INFERRED: "inferred",
});

export const DOMAIN_KEYS = Object.freeze({
  currentService: new Set([
    "currentProvider", "currentPlan", "currentSpeedMbps", "currentUploadMbps",
    "contractStatus", "serviceType", "outageFrequency", "reliabilityRating",
  ]),
  household: new Set([
    "householdSize", "remoteWorkers", "students", "gamers", "streamers",
    "smartHomeDevices", "children",
  ]),
  usage: new Set([
    "internetUsage", "workFromHome", "gaming", "streaming", "videoConferencing",
    "uploadHeavy", "deviceCount", "wifiCoverageNeed",
  ]),
  budget: new Set([
    "monthlyBill", "targetMonthlyBudget", "priceSensitivity", "installationBudget",
  ]),
  goals: new Set([
    "primaryPriority", "secondaryPriorities", "desiredSpeedMbps",
    "desiredProvider", "switchTimeline",
  ]),
  painPoints: new Set([
    "slowSpeed", "outages", "highPrice", "poorWifi", "poorSupport",
    "dataCaps", "latency", "uploadSpeed", "contractConcern",
  ]),
  location: new Set([
    "address", "city", "state", "postalCode", "moving",
  ]),
  buyingSignals: new Set([
    "readyToSwitch", "requestedQuote", "requestedOrder", "urgency",
    "decisionAuthority",
  ]),
});

export const CONFIDENCE = Object.freeze({
  EXPLICIT: 0.99,
  STRONG_INFERENCE: 0.85,
  MODERATE_INFERENCE: 0.72,
  WEAK_INFERENCE: 0.58,
});
