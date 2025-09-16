const BASE_URL = "http://localhost:8787";

function buildHeaders(extra = {}) {
  const headers = { ...extra };
  // Inject OpenAI key from localStorage if available so the server can use it
  try {
    const k = localStorage.getItem("OPENAI_KEY");
    if (k && !headers["x-openai-key"]) headers["x-openai-key"] = k;
  } catch {
    /* noop */
  }
  return headers;
}

async function parseJsonOrThrow(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function listScripts() {
  const res = await fetch(`${BASE_URL}/api/scripts`);
  return parseJsonOrThrow(res);
}

export async function getScript(id) {
  const res = await fetch(`${BASE_URL}/api/scripts/${id}`);
  return parseJsonOrThrow(res);
}

export async function runScript(id) {
  const res = await fetch(`${BASE_URL}/api/scripts/${id}/run`, {
    method: "POST",
  });
  return parseJsonOrThrow(res);
}

export async function saveScript(id, code) {
  const res = await fetch(`${BASE_URL}/api/scripts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...buildHeaders() },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Save failed");
  return parseJsonOrThrow(res);
}

export async function createScript(prompt) {
  const res = await fetch(`${BASE_URL}/api/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildHeaders() },
    body: JSON.stringify({ prompt }),
  });
  return parseJsonOrThrow(res);
}

export async function searchScripts(q) {
  const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}`);
  return parseJsonOrThrow(res);
}

export async function aiTransform({ prompt, code, name }) {
  const res = await fetch(`${BASE_URL}/api/ai/transform`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildHeaders() },
    body: JSON.stringify({ prompt, code, name }),
  });
  return parseJsonOrThrow(res);
}
