# Style + didactic-method RAG

> A local-first RAG that retrieves few-shot **style** examples to replicate an
> author's writing voice **and** didactic method — then explains new topics that way.

Instead of retrieving *data to answer with*, it retrieves *samples of how an author
teaches* and uses them to condition the model. Also known as *few-shot retrieval*
or *style-conditioning*.

## Features

- 🎭 **Style + method** — replicates not just the tone, but the reasoning skeleton
  (framing → analogy → order → "aha").
- 🗂️ **Profiles** — each writing voice has its own corpus and index. One profile,
  one intent.
- 📥 **Multi-format ingestion** — `.txt` `.md` `.pdf` (text & scanned) and images,
  via a pluggable OCR backend (`tesseract` on CPU, `unlimited` on GPU).
- 📝 **Long-form** — coherent multi-thousand-word texts via *plan → expand → edit*.
- 🖥️ **Web UI** — a single-file standalone (`scrivo.html`, no build step) plus a
  local FastAPI backend. Generate in a profile's voice from the browser, with
  streaming, parameters and file-drop ingestion. See [Web UI](#web-ui).
- 💻 **100% local & free** — `sentence-transformers` for embeddings, Ollama for
  generation. No API keys.

## Quick start

```bash
pip install -r requirements.txt          # base deps (CPU)
ollama pull llama3.1                      # for generation

# create a profile, add texts, build the index
python rag_style.py profile create demo --desc "explains with analogies"
python rag_style.py ingest demo ./notes/*.pdf ./photos/*.jpg
python rag_style.py index demo

# inspect retrieval (no Ollama) · generate a short explanation
python rag_style.py retrieve demo "how to explain derivatives"
python rag_style.py explain  demo "how to explain derivatives"

# generate a long report
python rag_style.py compose demo "report on world peace" --words 10000 --auto -o report.md
```

Two ready-to-use profiles ship with the repo — `demo-divulgador` (didactic
explainer) and `ensayista-social` (social-essay voice). Run `index` on either
before use (see [Notes](#notes) on why the index isn't committed).

## How it works

```
ingest → chunking → embeddings → index → retrieval → generation
(any format)  (~120 words)   (vectors)  (.npz/profile)  (cosine)    (Ollama)
```

**Long-form** (`compose`) builds the text in three stages instead of one shot:

1. **Plan** — an outline with thesis + sections, each with a *unique angle* and a
   word budget (the unique angle prevents repetition at the root).
2. **Expand** — section by section, each fed the thesis, a *rolling summary* of
   what's written so far, and style examples retrieved *for that section*.
3. **Edit** — a per-section coherence pass (skip with `--no-edit`).

Use `outline` first if you want to review/edit the plan before expanding.

## Commands

| Command | What it does |
| --- | --- |
| `profile create <name> [--desc] [--metodo]` | create a writing profile |
| `profile list` | list profiles and index status |
| `ingest <profile> <files...>` | copy files (any format) into the corpus |
| `index <profile> [--ocr tesseract\|unlimited] [--lang]` | build the index |
| `retrieve <profile> "topic" [--random]` | show retrieved fragments (no generation) |
| `explain <profile> "topic" [--show-prompt]` | short explanation in style+method |
| `outline <profile> "topic" --words N [-o]` | generate only the plan |
| `compose <profile> "topic" --words N [--auto] [--from-outline] [--no-edit] [--model] [-o]` | long coherent text |

## Web UI

Prefer a browser to the CLI? A thin FastAPI layer (`api/`) exposes the same core
over HTTP — it's a *second delivery layer*, like the CLI, with no business logic
of its own. Two frontends consume it:

- **`scrivo.html`** — a single-file standalone (HTML + vanilla JS, **no build
  step**). Open it and write in a profile's voice: pick a profile, type a brief,
  stream the result, tweak model / temperature / top-k / max-tokens, and create
  new profiles by dropping files in. Falls back to a demo mode when no backend is
  reachable.
- **`web/`** — a React + Vite MVP (profile → retrieve → streamed explanation).

```bash
pip install -r api/requirements.txt
uvicorn api.main:app --port 8000     # backend on :8000

open scrivo.html                     # the standalone — that's it
# or, for the React app:
cd web && npm install && npm run dev
```

The backend serves the standalone's contract at the root (`/health`, `/models`,
`/profiles`, `/generate`) and the React app's at `/api/*`. The CLI does **not**
need any of this; the web layer is entirely optional.

## Requirements

| Need | Install |
| --- | --- |
| Base (CPU) | `sentence-transformers`, `numpy`, `requests` |
| PDF / images | `pymupdf`, `pytesseract` + `brew install tesseract tesseract-lang` |
| Generation | [Ollama](https://ollama.com) running + a pulled model |
| Web UI (optional) | `pip install -r api/requirements.txt` (`fastapi`, `uvicorn`) |

`index`, `retrieve` and `outline` don't need Ollama; `explain` and `compose` do.

## Notes

- **Language** — bundled prompts and demo docs are in Spanish, so output is in
  Spanish. Code, comments and this README are in English. Adapt the prompt strings
  in `style_rag/generation.py` / `longform.py` to change the output language.
- **Indexes aren't committed** — `profiles/*/index.npz` is git-ignored (it's a
  generated artifact, rebuilt from the corpus). A freshly cloned profile has *no*
  index, so run `index <profile>` once before `retrieve`/`explain`/`compose`.
- **OCR ≠ chunking** — OCR turns images into text; it does *not* replace chunking,
  which is what makes retrieval find the relevant fragment.
- **Quality bottleneck is the model** — the scaffolding holds structure, but a
  small model (3B) repeats phrases. Use `--model` with a bigger one for long texts.

## License

MIT — add a `LICENSE` file before publishing.
