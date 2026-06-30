// Thin client over the FastAPI backend. URLs are relative because Vite proxies
// /api to the backend (see vite.config.js).

export async function getProfiles() {
  const res = await fetch('/api/profiles')
  if (!res.ok) throw new Error('No pude cargar los perfiles')
  return res.json()
}

export async function retrieve({ profile, query, random = false }) {
  const res = await fetch('/api/retrieve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, query, random }),
  })
  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({}))
    throw new Error(detail || 'Falló el retrieve')
  }
  return (await res.json()).results
}

// Streams the explanation. The backend sends Server-Sent Events:
//   { type: 'examples', examples: [...] }   -> the retrieved fragments
//   { type: 'token', token: '...' }         -> one piece of the answer
//   { type: 'done' }                        -> finished
//   { type: 'error', message: '...' }       -> something failed mid-stream
// `handlers` receives onExamples, onToken, onError, onDone.
export async function explainStream({ profile, query, random = false }, handlers) {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, query, random }),
  })

  if (!res.ok) {
    const { detail } = await res.json().catch(() => ({}))
    handlers.onError?.(detail || 'Falló el explain')
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() // keep the trailing partial frame for the next chunk
    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const event = JSON.parse(line.slice(6))
      if (event.type === 'examples') handlers.onExamples?.(event.examples)
      else if (event.type === 'token') handlers.onToken?.(event.token)
      else if (event.type === 'error') handlers.onError?.(event.message)
      else if (event.type === 'done') handlers.onDone?.()
    }
  }
}
