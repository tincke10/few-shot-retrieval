import { useEffect, useState } from 'react'
import { getProfiles, explainStream } from './api'
import './App.css'

export default function App() {
  const [profiles, setProfiles] = useState([])
  const [profile, setProfile] = useState('')
  const [query, setQuery] = useState('')
  const [examples, setExamples] = useState([])
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | streaming | error | done
  const [error, setError] = useState('')

  useEffect(() => {
    getProfiles()
      .then((ps) => {
        setProfiles(ps)
        if (ps.length) setProfile(ps[0].name)
      })
      .catch((e) => setError(e.message))
  }, [])

  const busy = status === 'loading' || status === 'streaming'

  async function onSubmit(e) {
    e.preventDefault()
    if (!profile || !query.trim() || busy) return

    setExamples([])
    setAnswer('')
    setError('')
    setStatus('loading')

    await explainStream(
      { profile, query: query.trim() },
      {
        onExamples: (ex) => {
          setExamples(ex)
          setStatus('streaming')
        },
        onToken: (t) => setAnswer((prev) => prev + t),
        onError: (msg) => {
          setError(msg)
          setStatus('error')
        },
        onDone: () => setStatus('done'),
      },
    )
  }

  const selected = profiles.find((p) => p.name === profile)

  return (
    <div className="app">
      <header>
        <h1>Style RAG</h1>
        <p className="tagline">
          Explicá un tema nuevo en la <strong>voz y el método</strong> de un autor.
        </p>
      </header>

      <form onSubmit={onSubmit} className="controls">
        <label className="field">
          <span>Perfil</span>
          <select value={profile} onChange={(e) => setProfile(e.target.value)} disabled={busy}>
            {profiles.map((p) => (
              <option key={p.name} value={p.name} disabled={!p.indexed}>
                {p.name} {p.indexed ? '' : '(sin índice)'}
              </option>
            ))}
          </select>
        </label>

        <label className="field grow">
          <span>Tema a explicar</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ej: cómo funciona la fotosíntesis"
            disabled={busy}
          />
        </label>

        <button type="submit" disabled={busy || !query.trim()}>
          {busy ? 'Generando…' : 'Explicar'}
        </button>
      </form>

      {selected && <p className="profile-desc">{selected.description}</p>}

      {error && <div className="error">{error}</div>}

      <div className="results">
        {examples.length > 0 && (
          <aside className="examples">
            <h2>Fragmentos recuperados</h2>
            {examples.map((ex) => (
              <div key={ex.rank} className="fragment">
                <div className="fragment-meta">
                  <span className="source">{ex.source}</span>
                  <span className="score">
                    {Number.isNaN(ex.score) ? 'azar' : `coseno ${ex.score.toFixed(3)}`}
                  </span>
                </div>
                <p>{ex.text}</p>
              </div>
            ))}
          </aside>
        )}

        {(answer || status === 'streaming' || status === 'loading') && (
          <section className="answer">
            <h2>
              Explicación
              {status === 'streaming' && <span className="cursor">▌</span>}
            </h2>
            {status === 'loading' && !answer && <p className="muted">Recuperando ejemplos…</p>}
            <div className="answer-text">{answer}</div>
          </section>
        )}
      </div>
    </div>
  )
}
