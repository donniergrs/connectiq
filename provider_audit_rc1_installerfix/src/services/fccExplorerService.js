const API_BASE_URL = "http://localhost:5001";

export async function runFccExplorer(payload) {
  const response = await fetch(`${API_BASE_URL}/api/fcc/explore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("FCC explorer request failed.");
  return response.json();
}

export async function runFccDiagnostic() {
  const response = await fetch(`${API_BASE_URL}/api/fcc/diagnostic`);
  if (!response.ok) throw new Error("FCC diagnostic failed.");
  return response.json();
}
