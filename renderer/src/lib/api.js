const BASE_URL = "http://localhost:8787";

function buildHeaders(extra = {}) {
  return { ...extra };
}

async function parseJsonOrThrow(res) {
  const contentType = res.headers.get("content-type") || "";

  // Try to parse JSON if possible
  const parseJsonSafe = async () => {
    try {
      if (contentType.includes("application/json")) {
        return await res.json();
      }
    } catch {
      /* fallthrough */
    }
    return null;
  };

  if (!res.ok) {
    const json = await parseJsonSafe();
    const serverMsg = json?.error || json?.message || null;
    let textSnippet = "";
    if (!serverMsg) {
      try {
        const t = await res.text();
        textSnippet = t.slice(0, 200);
      } catch {
        /* ignore */
      }
    }
    const msg = serverMsg || textSnippet || res.statusText || "Request failed";
    throw new Error(`${res.status} ${msg}`);
  }

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

export async function stopScript(id) {
  const res = await fetch(`${BASE_URL}/api/scripts/${id}/stop`, {
    method: "POST",
  });
  return parseJsonOrThrow(res);
}

export async function getScriptLog(id) {
  const res = await fetch(`${BASE_URL}/api/scripts/${id}/log`);
  if (!res.ok) return "";
  return res.text();
}

export async function saveScript(id, code) {
  const res = await fetch(`${BASE_URL}/api/scripts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...buildHeaders() },
    body: JSON.stringify({ code }),
  });
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
