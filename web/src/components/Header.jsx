import { MONO } from '../styles.jsx';

const HEALTH = {
  checking: { c: '#9ca3af', l: 'verificando…' },
  demo: { c: '#f5b942', l: 'modo demo' },
  online: { c: '#34d399', l: 'ollama activo' },
  degraded: { c: '#f5b942', l: 'backend degradado' },
  offline: { c: '#f87171', l: 'backend offline' },
};

const pill = {
  fontFamily: MONO, fontSize: 11, padding: '7px 11px', borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
};

export default function Header({ model, health }) {
  const h = HEALTH[health] || HEALTH.checking;
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 27, height: 27, borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8 0%,#6366f1 52%,#a855f7 100%)', boxShadow: '0 4px 18px rgba(99,102,241,0.4)' }} />
        <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em' }}>scrivo</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.38)', paddingTop: 3, letterSpacing: '0.02em' }}>few-shot writing engine</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ ...pill, color: 'rgba(255,255,255,0.5)' }}>{model}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.c, boxShadow: '0 0 9px ' + h.c, animation: 'scrivo-pulse 2.2s ease-in-out infinite', display: 'inline-block' }} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>{h.l}</span>
        </div>
      </div>
    </header>
  );
}
