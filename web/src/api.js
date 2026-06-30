// Client for the Scrivo backend contract. URLs are relative; Vite proxies them
// to the FastAPI backend (see vite.config.js).

export async function getProfiles() {
  const r = await fetch('/profiles');
  if (!r.ok) throw new Error('profiles ' + r.status);
  return r.json(); // [{ id, name, description, examplesCount }]
}

export async function getModels() {
  const r = await fetch('/models');
  if (!r.ok) throw new Error('models ' + r.status);
  const data = await r.json();
  return data.map((m) => m.name || m);
}

export async function getHealth() {
  const r = await fetch('/health');
  return r.json(); // { ok, ollama }
}

// Streams generation. Calls handlers as SSE events arrive:
//   onRetrieved(items) · onToken(text) · onError(message) · onDone()
// Returns the Response so the caller can abort via an AbortController signal.
export async function generate(body, handlers, signal) {
  const r = await fetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) {
    let detail = 'HTTP ' + r.status;
    try { detail = (await r.json()).detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop();
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.retrieved) handlers.onRetrieved?.(ev.retrieved);
        if (ev.token || ev.delta) handlers.onToken?.(ev.token || ev.delta);
        if (ev.output) handlers.onToken?.(ev.output, true);
        if (ev.error) handlers.onError?.(ev.error);
      } catch (_) { handlers.onToken?.(payload); }
    }
  }
  handlers.onDone?.();
}

// Creates a profile from files (multipart). Returns { id, name, examplesCount }.
export async function createProfile({ name, description, files }) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('description', description);
  files.forEach((f) => fd.append('files', f.file, f.name));
  const r = await fetch('/profiles', { method: 'POST', body: fd });
  if (!r.ok) {
    let detail = 'HTTP ' + r.status;
    try { detail = (await r.json()).detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  return r.json();
}
