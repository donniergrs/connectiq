const QUESTION_LIBRARY = [
  {
    id: "address",
    domain: "location",
    key: "address",
    value: 100,
    question: "What is the full service address so I can check the providers available there?",
  },
  {
    id: "priority",
    domain: "goals",
    key: "primaryPriority",
    value: 92,
    question: "What matters most: a lower bill, faster speed, stronger reliability, or better Wi-Fi coverage?",
  },
  {
    id: "currentProvider",
    domain: "currentService",
    key: "currentProvider",
    value: 82,
    question: "Who is your current internet provider?",
  },
  {
    id: "monthlyBill",
    domain: "budget",
    key: "monthlyBill",
    value: 78,
    question: "About how much are you paying each month for internet?",
  },
  {
    id: "usage",
    domain: "usage",
    key: "internetUsage",
    value: 75,
    question: "How do you mainly use the connection—remote work, streaming, gaming, or everyday browsing?",
  },
  {
    id: "household",
    domain: "household",
    key: "householdSize",
    value: 62,
    question: "How many people and connected devices typically use the internet at the same time?",
  },
  {
    id: "timeline",
    domain: "goals",
    key: "switchTimeline",
    value: 55,
    question: "How soon would you like to make a change?",
  },
];

function factExists(twin, domain, key) {
  return twin?.understanding?.[domain]?.[key]?.value !== undefined;
}

export function chooseNextQuestion({ twin = null, analysis }) {
  const inferredKeys = new Set((analysis?.facts || []).map((fact) => `${fact.domain}.${fact.key}`));
  const candidates = QUESTION_LIBRARY
    .filter((item) => !factExists(twin, item.domain, item.key))
    .filter((item) => !inferredKeys.has(`${item.domain}.${item.key}`))
    .map((item) => {
      let score = item.value;
      if (analysis?.intent?.primary === "FIND_PROVIDER" && item.id === "address") score += 50;
      if (analysis?.intent?.primary === "LOWER_BILL" && item.id === "monthlyBill") score += 30;
      if (analysis?.intent?.primary === "IMPROVE_RELIABILITY" && item.id === "currentProvider") score += 15;
      if (analysis?.sentiment?.urgency === "high" && item.id === "timeline") score += 20;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = candidates[0] || null;
  return selected ? {
    id: selected.id,
    question: selected.question,
    reason: `Highest information value for ${analysis?.intent?.primary || "current conversation"}.`,
    score: selected.score,
  } : {
    id: "confirm",
    question: "Would you like me to compare the best available options and prepare a recommendation?",
    reason: "Core discovery information is sufficiently complete.",
    score: 10,
  };
}
