import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './api';
import { mockOutput, mockProfiles, mockRetrieved } from './mocks';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('perfil-' + Date.now());

const FALLBACK_MODELS = ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5', 'phi3'];

// All Scrivo state + actions. The components are presentational; this is the brain.
export function useScrivo() {
  const [profiles, setProfiles] = useState([]);
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('llama3.1');
  const [temperature, setTemperature] = useState(0.7);
  const [retrievalTopK, setRetrievalTopK] = useState(4);
  const [maxTokens, setMaxTokens] = useState(1024);

  const [output, setOutput] = useState('');
  const [retrieved, setRetrieved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState('checking');
  const [backend, setBackend] = useState(false);

  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestName, setIngestName] = useState('');
  const [ingestDesc, setIngestDesc] = useState('');
  const [ingestFiles, setIngestFiles] = useState([]);
  const [ingesting, setIngesting] = useState(false);

  const abortRef = useRef(null);
  const cancelledRef = useRef(false);

  // --- bootstrap: load profiles/models/health, then pick an initial profile ---
  useEffect(() => {
    (async () => {
      let resolved = null;
      let isBackend = false;
      try {
        const ps = await api.getProfiles();
        if (Array.isArray(ps)) { resolved = ps; isBackend = true; }
      } catch (_) { /* fall back to demo below */ }
      if (resolved === null) resolved = mockProfiles();
      setProfiles(resolved);

      try {
        const ms = await api.getModels();
        if (ms.length) { setModels(ms); setModel((m) => (ms.includes(m) ? m : ms[0])); }
      } catch (_) {}

      try {
        const h = await api.getHealth();
        setHealth(h.ok && h.ollama ? 'online' : 'degraded');
        isBackend = true;
      } catch (_) { setHealth('demo'); }

      setBackend(isBackend);
      setSelectedProfileId((prev) => prev || resolved[0]?.id || null);
    })();
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const canGenerate = !!(prompt.trim() && selectedProfileId && !loading);

  // --- generation ---
  const generate = useCallback(async () => {
    if (!prompt.trim() || !selectedProfileId || loading) return;
    cancelledRef.current = false;
    setLoading(true); setStreaming(true); setError(null);
    setOutput(''); setRetrieved([]);

    const body = { profileId: selectedProfileId, prompt, model, temperature, retrievalTopK, maxTokens };

    if (backend) {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        await api.generate(body, {
          onRetrieved: (items) => setRetrieved(items),
          onToken: (t, replace) => setOutput((prev) => (replace ? t : prev + t)),
          onError: (msg) => setError(msg),
          onDone: () => {},
        }, ctrl.signal);
        setLoading(false); setStreaming(false);
        return;
      } catch (e) {
        if (e.name === 'AbortError') { setLoading(false); setStreaming(false); return; }
        setError('No se pudo generar con el backend (' + e.message + '). Mostrando una salida de demostración.');
      }
    }

    // Demo fallback
    await sleep(450);
    if (cancelledRef.current) { setLoading(false); setStreaming(false); return; }
    setRetrieved(mockRetrieved(selectedProfileId, retrievalTopK));
    await sleep(220);
    const full = mockOutput(selectedProfileId, prompt);
    const parts = full.split(/(\s+)/);
    let acc = '';
    for (const part of parts) {
      if (cancelledRef.current) break;
      await sleep(15 + Math.random() * 26);
      acc += part;
      setOutput(acc);
    }
    setLoading(false); setStreaming(false);
  }, [prompt, selectedProfileId, loading, backend, model, temperature, retrievalTopK, maxTokens]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (abortRef.current) abortRef.current.abort();
    setLoading(false); setStreaming(false);
  }, []);

  // --- ingest ---
  const addFiles = useCallback(async (fileList) => {
    const incoming = Array.from(fileList || []);
    const additions = [];
    for (const f of incoming) {
      let examples;
      const isText = /\.(txt|md|markdown|csv|json|html?)$/i.test(f.name) || (f.type && f.type.startsWith('text'));
      if (isText) {
        try {
          const blocks = (await f.text()).split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
          examples = Math.max(1, blocks.length);
        } catch (_) { examples = Math.max(1, Math.round(f.size / 800)); }
      } else { examples = Math.max(1, Math.round(f.size / 800)); }
      additions.push({ name: f.name, size: f.size, examples, file: f });
    }
    setIngestFiles((cur) => {
      const out = cur.slice();
      for (const a of additions) if (!out.some((e) => e.name === a.name && e.size === a.size)) out.push(a);
      return out;
    });
  }, []);

  const removeFile = useCallback((name, size) =>
    setIngestFiles((cur) => cur.filter((f) => !(f.name === name && f.size === size))), []);

  const cancelIngest = useCallback(() => {
    setIngestOpen(false); setIngestName(''); setIngestDesc(''); setIngestFiles([]);
  }, []);

  const createProfile = useCallback(async () => {
    const name = ingestName.trim();
    if (!name || ingestFiles.length === 0 || ingesting) return;
    setIngesting(true);
    const localCount = ingestFiles.reduce((a, f) => a + f.examples, 0);
    const desc = ingestDesc.trim() || ('Voz creada a partir de ' + ingestFiles.length + ' archivo(s).');
    let prof = { id: slug(name), name, description: desc, examplesCount: localCount, custom: true };

    if (backend) {
      try {
        const j = await api.createProfile({ name, description: desc, files: ingestFiles });
        prof = { id: j.id, name: j.name || j.id, description: j.description || desc, examplesCount: j.examplesCount ?? localCount, custom: true };
      } catch (e) {
        setIngesting(false);
        setError('No se pudo crear el perfil en el backend (' + e.message + ').');
        return;
      }
    } else {
      await sleep(900);
    }

    setProfiles((cur) => (cur.some((p) => p.id === prof.id) ? cur : [...cur, prof]));
    setSelectedProfileId(prof.id);
    setIngesting(false); setIngestOpen(false);
    setIngestName(''); setIngestDesc(''); setIngestFiles([]);
  }, [ingestName, ingestDesc, ingestFiles, ingesting, backend]);

  return {
    // data
    profiles, models, selectedProfileId, selectedProfile, prompt, model,
    temperature, retrievalTopK, maxTokens, output, retrieved, loading, streaming,
    error, health, canGenerate,
    // setters
    setSelectedProfileId, setPrompt, setModel, setTemperature, setRetrievalTopK, setMaxTokens,
    // actions
    generate, stop,
    // ingest
    ingestOpen, setIngestOpen, ingestName, setIngestName, ingestDesc, setIngestDesc,
    ingestFiles, ingesting, addFiles, removeFile, cancelIngest, createProfile,
  };
}
