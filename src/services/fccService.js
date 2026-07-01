const API_BASE_URL = "http://localhost:5001";

const MOCK_PROVIDERS = [
  { id: "lumos", name: "Lumos Fiber", technology: "Fiber", download: 5000, upload: 5000 },
  { id: "att", name: "AT&T Fiber", technology: "Fiber", download: 5000, upload: 5000 },
  { id: "spectrum", name: "Spectrum", technology: "Cable", download: 1000, upload: 40 },
];

export async function lookupProviders(address) {
  try {
    console.log("Calling ConnectIQ backend:", address);

    const response = await fetch(`${API_BASE_URL}/api/fcc/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    });

    if (!response.ok) {
      console.warn("Backend failed. Using fallback providers.");
      return MOCK_PROVIDERS;
    }

    const data = await response.json();
    return data.providers?.length ? data.providers : MOCK_PROVIDERS;
  } catch (error) {
    console.warn("Backend unavailable. Using fallback providers.", error);
    return MOCK_PROVIDERS;
  }
}
