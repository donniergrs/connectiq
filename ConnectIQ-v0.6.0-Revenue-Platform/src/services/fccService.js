const API_BASE_URL = import.meta.env.VITE_CONNECTIQ_API_URL || "http://localhost:5001";

export async function lookupProviders(address, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/fcc/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
    signal,
  });

  if (!response.ok) throw new Error(`Provider lookup failed (${response.status}).`);
  const data = await response.json();
  if (data?.ok === false && data?.providerCount !== 0) {
    throw new Error(data.message || data.error || "Provider lookup failed.");
  }

  return {
    ...data,
    address,
    providers: Array.isArray(data?.providers) ? data.providers : [],
    providerCount: Array.isArray(data?.providers) ? data.providers.length : 0,
    fallbackProviders: [],
  };
}

export { API_BASE_URL };
