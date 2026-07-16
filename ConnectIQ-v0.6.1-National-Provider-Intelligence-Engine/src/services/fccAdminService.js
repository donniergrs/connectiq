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
    body: JSON.stringify({ street: address, full: address }),
  });

  if (!response.ok) throw new Error("FCC lookup failed");
  return response.json();
}
