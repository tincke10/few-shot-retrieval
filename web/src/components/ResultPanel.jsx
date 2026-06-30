import { useState } from 'react';
import { MONO, SectionHeader, panel } from '../styles.jsx';

function actionBtn(onClick, label, key) {
  return (
    <button key={key} className="ghost-hover mono" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer' }}>{label}</button>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {[42, 96, 88, 70].map((w, i) => (
        <div key={i} style={{ height: 13, width: w + '%', borderRadius: 6, background: 'linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.1),rgba(255,255,255,0.04))', backgroundSize: '800px 100%', animation: 'scrivo-shimmer 1.4s linear infinite' }} />
      ))}
    </div>
  );
}

export default function ResultPanel({ output, loading, streaming, error, selectedProfile, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const hasOutput = output.length > 0;
  const label = selectedProfile ? 'perfil · ' + selectedProfile.name.toLowerCase() : 'resultado';

  const copy = async () => {
    try { await navigator.clipboard.writeText(output); } catch (_) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionHeader num="03">Resultado</SectionHeader>
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
          {hasOutput && (
            <div style={{ display: 'flex', gap: 8 }}>
              {actionBtn(copy, copied ? 'copiado ✓' : 'copiar', 'copy')}
              {actionBtn(onRegenerate, 'regenerar', 'regen')}
            </div>
          )}
        </div>

        <div style={{ padding: 22, minHeight: 280 }}>
          {error && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 15px', borderRadius: 11, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', marginBottom: 18 }}>
              <span style={{ color: '#f87171', fontSize: 15, lineHeight: 1.3 }}>⚠</span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.78)' }}>{error}</span>
            </div>
          )}

          {loading && !hasOutput && <Skeleton />}

          {hasOutput && (
            <div style={{ fontSize: 15, lineHeight: 1.72, color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {output}
              {streaming && <span style={{ display: 'inline-block', width: 8, height: 17, background: '#a855f7', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'scrivo-blink 1s step-end infinite' }} />}
            </div>
          )}

          {!hasOutput && !loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 240, gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: 18, height: 18, borderRadius: 6, background: 'linear-gradient(135deg,#38bdf8,#a855f7)', opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 320, lineHeight: 1.55 }}>
                El texto generado va a aparecer acá.<br />Elegí un perfil, escribí tu brief y presioná <span className="mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Generar</span>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
