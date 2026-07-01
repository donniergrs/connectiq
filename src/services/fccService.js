const FCC_API_BASE_URL = import.meta.env.VITE_FCC_API_BASE_URL;
const FCC_USERNAME = import.meta.env.VITE_FCC_USERNAME;
const FCC_HASH_VALUE = import.meta.env.VITE_FCC_HASH_VALUE;

const MOCK_PROVIDERS = [
  { id: "lumos", name: "Lumos Fiber", technology: "Fiber", download: 5000, upload: 5000 },
  { id: "att", name: "AT&T Fiber", technology: "Fiber", download: 5000, upload: 5000 },
  { id: "spectrum", name: "Spectrum", technology: "Cable", download: 1000, upload: 40 },
];

export async function lookupProviders(address) {
  if (!FCC_USERNAME || !FCC_HASH_VALUE) {
    console.warn("FCC credentials missing. Using mock provider results.");
    await new Promise((resolve) => setTimeout(resolve, 600));
    return MOCK_PROVIDERS;
  }

  try {
    const asOfResponse = await fetch(`${FCC_API_BASE_URL}/listAsOfDates`, {
      headers: {
        username: FCC_USERNAME,
        hash_value: FCC_HASH_VALUE,
      },
    });

    if (!asOfResponse.ok) {
      throw new Error("FCC API request failed.");
    }

    const data = await asOfResponse.json();

    console.log("FCC API response:", data);

    return MOCK_PROVIDERS;
  } catch (error) {
    console.error("FCC lookup failed:", error);
    return MOCK_PROVIDERS;
  }
}