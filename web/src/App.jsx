import Header from './components/Header.jsx';
import ProfilesSection from './components/ProfilesSection.jsx';
import IngestPanel from './components/IngestPanel.jsx';
import BriefPanel from './components/BriefPanel.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import RetrievedPanel from './components/RetrievedPanel.jsx';
import { useScrivo } from './useScrivo.js';

export default function App() {
  const s = useScrivo();

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', paddingBottom: 90 }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px' }}>
        <Header model={s.model} health={s.health} />

        {/* Hero */}
        <section style={{ position: 'relative', padding: '62px 0 30px' }}>
          <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 680, maxWidth: '100%', height: 300, background: 'radial-gradient(ellipse at center,rgba(99,102,241,0.20),rgba(168,85,247,0.06) 45%,transparent 72%)', filter: 'blur(8px)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 22 }}>RAG · few-shot retrieval · ollama local</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(34px,5.4vw,60px)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.02, maxWidth: 760 }}>
              Escribí en cualquier voz.<br />
              <span style={{ background: 'linear-gradient(120deg,#38bdf8 0%,#6366f1 50%,#a855f7 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>Sin alucinar.</span>
            </h1>
            <p style={{ margin: '24px 0 0', fontSize: 17, lineHeight: 1.62, color: 'rgba(255,255,255,0.55)', maxWidth: 600 }}>
              Elegí un perfil de escritura. El motor recupera los ejemplos más parecidos de su corpus y guía al modelo local de Ollama para que el texto suene exactamente como vos.
            </p>
          </div>
        </section>

        <ProfilesSection
          profiles={s.profiles}
          selectedProfileId={s.selectedProfileId}
          onSelect={s.setSelectedProfileId}
          onNewProfile={() => s.setIngestOpen(!s.ingestOpen)}
        />
        {s.ingestOpen && (
          <IngestPanel
            ingestName={s.ingestName} setIngestName={s.setIngestName}
            ingestDesc={s.ingestDesc} setIngestDesc={s.setIngestDesc}
            ingestFiles={s.ingestFiles} ingesting={s.ingesting}
            addFiles={s.addFiles} removeFile={s.removeFile}
            cancelIngest={s.cancelIngest} createProfile={s.createProfile}
          />
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', marginTop: 50 }}>
          <BriefPanel
            prompt={s.prompt} setPrompt={s.setPrompt}
            onGenerate={s.generate} onStop={s.stop}
            loading={s.loading} canGenerate={s.canGenerate}
            models={s.models} model={s.model} setModel={s.setModel}
            temperature={s.temperature} setTemperature={s.setTemperature}
            retrievalTopK={s.retrievalTopK} setRetrievalTopK={s.setRetrievalTopK}
            maxTokens={s.maxTokens} setMaxTokens={s.setMaxTokens}
          />
          <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ResultPanel
              output={s.output} loading={s.loading} streaming={s.streaming}
              error={s.error} selectedProfile={s.selectedProfile} onRegenerate={s.generate}
            />
            <RetrievedPanel retrieved={s.retrieved} fallbackCount={s.retrievalTopK} />
          </div>
        </div>
      </div>
    </div>
  );
}
