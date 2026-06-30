import { useState } from 'react';
import { GRAD, MONO, field, label } from '../styles.jsx';

function formatSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

export default function IngestPanel({
  ingestName, setIngestName, ingestDesc, setIngestDesc,
  ingestFiles, ingesting, addFiles, removeFile, cancelIngest, createProfile,
}) {
  const [dragOver, setDragOver] = useState(false);
  const total = ingestFiles.reduce((a, f) => a + f.examples, 0);
  const canCreate = !!(ingestName.trim() && ingestFiles.length && !ingesting);

  return (
    <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(129,140,248,0.28)', borderRadius: 16, padding: 22, animation: 'scrivo-fade 240ms ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Crear perfil desde archivos</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 5, lineHeight: 1.5, maxWidth: 520 }}>Los documentos se trocean e indexan como corpus de ejemplos few-shot para guiar a la nueva voz.</div>
        </div>
        <button className="ghost-hover" onClick={cancelIngest} style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={label}>Nombre del perfil</label>
            <input value={ingestName} onChange={(e) => setIngestName(e.target.value)} placeholder="Ej: Soporte técnico" style={field} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={label}>Descripción <span style={{ color: 'rgba(255,255,255,0.4)' }}>(opcional)</span></label>
            <textarea value={ingestDesc} onChange={(e) => setIngestDesc(e.target.value)} placeholder="Voz cercana, resolutiva y sin tecnicismos…" style={{ ...field, minHeight: 88, resize: 'vertical', lineHeight: 1.55 }} />
          </div>
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label
            onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 16px', borderRadius: 13, cursor: 'pointer', textAlign: 'center', border: '1px dashed ' + (dragOver ? 'rgba(129,140,248,0.7)' : 'rgba(255,255,255,0.18)'), background: dragOver ? 'rgba(99,102,241,0.09)' : 'rgba(255,255,255,0.015)', transition: 'all 150ms ease' }}
          >
            <input type="file" multiple accept=".txt,.md,.markdown,.pdf,.png,.jpg,.jpeg" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
            <span style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(129,140,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', fontSize: 17, background: 'rgba(99,102,241,0.08)' }}>↑</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>Arrastrá archivos o <span style={{ color: '#a5b4fc' }}>elegilos</span></span>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>.txt · .md · .pdf · imágenes</span>
          </label>

          {ingestFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ingestFiles.map((f) => (
                <div key={f.name + f.size} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>{formatSize(f.size)} · ~{f.examples} ej.</span>
                  </div>
                  <button className="danger-hover" onClick={() => removeFile(f.name, f.size)} style={{ flex: 'none', width: 24, height: 24, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {ingestFiles.length ? `~${total} ejemplos · ${ingestFiles.length} archivo${ingestFiles.length > 1 ? 's' : ''}` : 'Sumá al menos un archivo para crear el perfil.'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ghost-hover" onClick={cancelIngest} style={{ padding: '11px 18px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={createProfile} disabled={!canCreate} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 20px', borderRadius: 11, border: 'none', background: canCreate ? GRAD : 'rgba(255,255,255,0.06)', color: canCreate ? '#0a0a0a' : 'rgba(255,255,255,0.32)', fontSize: 14, fontWeight: 600, cursor: canCreate ? 'pointer' : 'not-allowed', transition: 'all 160ms ease' }}>
            {ingesting && <span style={{ width: 14, height: 14, border: '2px solid rgba(10,10,10,0.3)', borderTopColor: '#0a0a0a', borderRadius: '50%', display: 'inline-block', animation: 'scrivo-spin 0.7s linear infinite' }} />}
            {ingesting ? 'Procesando…' : 'Crear perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}
