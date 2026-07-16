const API_BASE_URL = import.meta.env.VITE_CONNECTIQ_API_URL || "http://localhost:5001";

export async function lookupProviders(address, { signal, refresh = false, includeAiResearch = true } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/provider-intelligence/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, refresh, includeAiResearch }),
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Provider lookup failed (${response.status}).`);

  return {
    ...data,
    address,
    providers: Array.isArray(data?.providers) ? data.providers : [],
    verifiedProviders: Array.isArray(data?.verifiedProviders) ? data.verifiedProviders : [],
    aiCandidates: Array.isArray(data?.aiCandidates) ? data.aiCandidates : [],
    providerCount: Array.isArray(data?.providers) ? data.providers.length : 0,
    candidateCount: Array.isArray(data?.aiCandidates) ? data.aiCandidates.length : 0,
    fallbackProviders: [],
  };
}

export { API_BASE_URL };
