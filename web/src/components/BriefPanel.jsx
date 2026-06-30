import { useState } from 'react';
import { GRAD, MONO, SectionHeader, field, label, panel } from '../styles.jsx';

function Spinner() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(10,10,10,0.3)', borderTopColor: '#0a0a0a', borderRadius: '50%', display: 'inline-block', animation: 'scrivo-spin 0.7s linear infinite' }} />;
}

function Params({ models, model, setModel, temperature, setTemperature, retrievalTopK, setRetrievalTopK, maxTokens, setMaxTokens }) {
  const [open, setOpen] = useState(true);
  const selStyle = { ...field, fontFamily: MONO, cursor: 'pointer' };
  return (
    <div style={panel}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: 'transparent', border: 'none', color: '#f5f5f5', cursor: 'pointer' }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Parámetros</span>
        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', transition: 'transform 200ms ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', lineHeight: 1 }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: '4px 18px 20px', display: 'flex', flexDirection: 'column', gap: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 16 }}>
            <label style={label}>Modelo Ollama</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} style={selStyle}>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={label}>Temperature</label>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#a5b4fc' }}>{temperature.toFixed(2)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={label}>Retrieval top-k <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>— ejemplos few-shot</span></label>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#a5b4fc' }}>{retrievalTopK}</span>
            </div>
            <input type="range" min="1" max="8" step="1" value={retrievalTopK} onChange={(e) => setRetrievalTopK(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <label style={label}>Max tokens</label>
            <select value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))} style={selStyle}>
              {[256, 512, 1024, 2048, 4096].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BriefPanel(props) {
  const { prompt, setPrompt, onGenerate, onStop, loading, canGenerate } = props;
  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onGenerate(); }
  };
  return (
    <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionHeader num="02">Tu brief</SectionHeader>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 18 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 4000))}
          onKeyDown={onKeyDown}
          placeholder="Describí qué querés generar. Ej: un anuncio de lanzamiento para la nueva función de exportación…"
          style={{ width: '100%', minHeight: 210, resize: 'vertical', background: 'transparent', border: 'none', color: '#f5f5f5', fontSize: 15, lineHeight: 1.62, padding: 0, display: 'block' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{prompt.length} / 4000</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>⌘ / Ctrl + ↵</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '13px 22px', borderRadius: 12, border: 'none',
            background: canGenerate ? GRAD : 'rgba(255,255,255,0.06)',
            color: canGenerate ? '#0a0a0a' : 'rgba(255,255,255,0.32)',
            fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            boxShadow: canGenerate ? '0 8px 26px rgba(99,102,241,0.32)' : 'none', transition: 'all 160ms ease',
          }}
        >
          {loading && <Spinner />}{loading ? 'Generando…' : 'Generar texto'}
        </button>
        {loading && (
          <button className="ghost-hover" onClick={onStop} style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Detener</button>
        )}
      </div>

      <Params {...props} />
    </div>
  );
}
