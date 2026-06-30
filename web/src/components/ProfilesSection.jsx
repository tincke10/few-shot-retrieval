import { MONO, SectionHeader } from '../styles.jsx';

function ProfileCard({ profile, index, selected, onSelect }) {
  const num = String(index + 1).padStart(2, '0');
  return (
    <button
      className="card-hover"
      onClick={onSelect}
      style={{
        textAlign: 'left', cursor: 'pointer', padding: 18, borderRadius: 14,
        background: selected ? 'rgba(99,102,241,0.09)' : 'rgba(255,255,255,0.02)',
        border: '1px solid ' + (selected ? 'rgba(129,140,248,0.6)' : 'rgba(255,255,255,0.08)'),
        boxShadow: selected ? '0 0 0 1px rgba(129,140,248,0.25), 0 10px 34px rgba(80,70,200,0.18)' : 'none',
        transition: 'all 180ms ease', color: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: 9,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mono grad-text" style={{ fontSize: 12, fontWeight: 500 }}>{num}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{profile.examplesCount} ejemplos</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{profile.name}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.52)' }}>{profile.description}</div>
    </button>
  );
}

export default function ProfilesSection({ profiles, selectedProfileId, onSelect, onNewProfile }) {
  return (
    <section style={{ paddingTop: 34 }}>
      <SectionHeader num="01">Perfil de escritura</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(228px,1fr))', gap: 14 }}>
        {profiles.map((p, i) => (
          <ProfileCard key={p.id} profile={p} index={i} selected={p.id === selectedProfileId} onSelect={() => onSelect(p.id)} />
        ))}
        <button
          className="card-hover"
          onClick={onNewProfile}
          style={{ textAlign: 'left', cursor: 'pointer', padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.012)', border: '1px dashed rgba(255,255,255,0.18)', color: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center', minHeight: 120, transition: 'all 180ms ease' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(129,140,248,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, lineHeight: 1, color: '#a5b4fc', background: 'rgba(99,102,241,0.08)' }}>+</span>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Nuevo perfil</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.45)' }}>Ingestá tus archivos para crear una voz nueva.</div>
        </button>
      </div>
    </section>
  );
}
