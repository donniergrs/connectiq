const API_BASE_URL = import.meta.env.VITE_CONNECTIQ_API_URL || "";

export async function lookupProviders(address, { signal, refresh = false } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/provider-intelligence/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, refresh }),
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Provider lookup failed (${response.status}).`);

  const providers = Array.isArray(data?.providers) && data.providers.length
    ? data.providers
    : (Array.isArray(data?.aiCandidates) ? data.aiCandidates : []);

  return {
    ...data,
    address,
    source: "openai",
    providers,
    providerCount: providers.length,
    status: providers.length ? "providers_found" : "no_providers_found",
    recommendationEligible: providers.length > 0,
  };
}

export { API_BASE_URL };
