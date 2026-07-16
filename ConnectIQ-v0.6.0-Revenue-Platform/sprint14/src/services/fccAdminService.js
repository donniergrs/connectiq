const API_BASE_URL = import.meta.env.VITE_CONNECTIQ_API_URL || "http://localhost:5001";

export async function runFccDiagnostic() {
  const response = await fetch(`${API_BASE_URL}/api/fcc/diagnostic`);
  if (!response.ok) throw new Error("FCC diagnostic failed");
  return response.json();
}

export async function lookupFccProviders(address) {
  const response = await fetch(`${API_BASE_URL}/api/fcc/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, street: address, full: address }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "FCC lookup failed");
  }

  return data;
}
