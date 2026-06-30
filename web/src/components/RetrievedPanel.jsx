import { useState } from 'react';
import { MONO, panel } from '../styles.jsx';

function Fragment({ item }) {
  const score = typeof item.score === 'number' ? item.score : parseFloat(item.score);
  const pct = Math.round(Math.max(0, Math.min(1, score || 0)) * 100);
  const scoreText = Number.isNaN(score) ? 'azar' : score.toFixed(2);
  return (
    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.42)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</span>
        <span className="mono grad-text" style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{scoreText}</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.66)' }}>{item.text}</div>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#38bdf8,#a855f7)', borderRadius: 2, transition: 'width 400ms ease' }} />
      </div>
    </div>
  );
}

export default function RetrievedPanel({ retrieved, fallbackCount }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={panel}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: 'transparent', border: 'none', color: '#f5f5f5', cursor: 'pointer' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Ejemplos recuperados</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#a5b4fc', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(99,102,241,0.1)' }}>{retrieved.length || fallbackCount}</span>
        </span>
        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', transition: 'transform 200ms ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', lineHeight: 1 }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: '4px 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {retrieved.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 16 }}>
              {retrieved.map((it, i) => <Fragment key={i} item={it} />)}
            </div>
          ) : (
            <div style={{ padding: '24px 4px', textAlign: 'center', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.4)' }}>
              Los ejemplos del corpus aparecerán acá al generar,<br />cada uno con su score de similitud y su fuente.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
