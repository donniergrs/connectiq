const API_BASE_URL = import.meta.env.VITE_CONNECTIQ_API_URL || "http://localhost:5001";

const MOCK_PROVIDERS = [
  { id: "lumos", name: "Lumos Fiber", technology: "Fiber", download: 5000, upload: 5000, source: "fallback" },
  { id: "att", name: "AT&T Fiber", technology: "Fiber", download: 5000, upload: 5000, source: "fallback" },
  { id: "spectrum", name: "Spectrum", technology: "Cable", download: 1000, upload: 40, source: "fallback" },
];

export async function lookupProviders(address) {
  const response = await fetch(`${API_BASE_URL}/api/fcc/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    throw new Error(`Provider lookup failed (${response.status}).`);
  }

  const data = await response.json();
  if (data?.ok === false) {
    throw new Error(data.message || data.error || "Provider lookup failed.");
  }

  const providers = Array.isArray(data?.providers) ? data.providers : [];
  return {
    ...data,
    address,
    providers,
    fallbackProviders: providers.length ? [] : MOCK_PROVIDERS,
  };
}

export { API_BASE_URL, MOCK_PROVIDERS };
