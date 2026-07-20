import { findProvider, listArticles } from "./repository.js";

const STOP = new Set(["the","is","it","a","an","and","or","to","of","for","with","how","what","do","does","their","they","i","my"]);
function tokens(value) { return [...new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [])].filter((t) => !STOP.has(t)); }

export function retrieveKnowledge({ message = "", providerName = "", limit = 5 } = {}) {
  const queryTokens = tokens(message);
  const provider = findProvider(providerName || message);
  const articles = listArticles().map((article) => {
    const haystack = tokens(`${article.title} ${article.tags.join(" ")} ${article.content.summary}`);
    const score = queryTokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    return { ...article, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return { provider, articles, confidence: provider || articles.length ? Math.min(0.95, 0.55 + articles.length * 0.08 + (provider ? 0.18 : 0)) : 0.2 };
}
