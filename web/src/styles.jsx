// Shared design tokens for the Scrivo UI. The visual language is dark + a
// sky→indigo→purple gradient, mirroring scrivo.html.

export const GRAD = 'linear-gradient(120deg,#38bdf8 0%,#6366f1 52%,#a855f7 100%)';
export const GRAD_TEXT = 'linear-gradient(120deg,#38bdf8,#a855f7)';
export const MONO = "'JetBrains Mono', monospace";

export const panel = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
};

export const sectionTag = {
  fontFamily: MONO,
  fontSize: 12,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
};

export const label = { fontSize: 13, color: 'rgba(255,255,255,0.7)' };

export const field = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '11px 13px',
  color: '#f5f5f5',
  fontSize: 14,
};

// A numbered "01 · SECTION" header with a fading rule.
export function SectionHeader({ num, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
      <span className="mono grad-text" style={{ fontSize: 13, fontWeight: 500 }}>{num}</span>
      <span style={sectionTag}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(255,255,255,0.13),transparent)' }} />
    </div>
  );
}
