# Style + didactic-method RAG (profile-based, 100% local)

A project to learn **one** RAG concept applied to education: how to retrieve
relevant examples and use them to condition a model. Here the examples aren't
"data to answer with" but **samples of how an author teaches**: their style *and*
their didactic method. The model learns to explain **new topics** with that same
voice and that same pedagogical "resolution algorithm".

This is called *few-shot retrieval* or *style-conditioning*.

> **Note on language:** the bundled prompts and demo documents are in Spanish, so
> the generated output is in Spanish. The code, comments and this README are in
> English. To target another language, adapt the prompt strings in
> `style_rag/generation.py` and `style_rag/longform.py`.

## The concept, in one sentence

> Replicating **style** copies the surface (tone, words). Replicating the
> **didactic method** copies the skeleton: how you frame the problem, which
> analogy you pick, in what order you take the idea apart, how you build the
> "aha". This project replicates both.

## What changed vs a classic style transfer

A style prompt tells you "copy the tone, ignore the content". Here we do the
opposite with structure: we **do** copy the author's reasoning method and apply
it to a new topic. The content is new; the method is borrowed.

## Profiles

Each **profile** is a voice + a method, with its own corpus and index:

```
profiles/
└── <profile>/
    ├── profile.json   # description + method notes (injected into the prompt)
    ├── documents/     # source files in ANY format
    └── index.npz      # vector index (built with `index`)
```

Have as many as you like: `math-teacher`, `popularizer`, `coding-tutor`…
One profile = one intent. Don't mix styles in the same index.

## Multi-format ingestion

`extract_text()` dispatches by extension and always returns **plain text**. The
rest of the pipeline doesn't know where it came from:

| Format | How it's ingested |
| --- | --- |
| `.txt` `.md` | direct read |
| `.pdf` with text | `pymupdf` |
| scanned `.pdf` | `pymupdf` renders the page → OCR (automatic per-page fallback) |
| `.png` `.jpg` `.jpeg` `.tiff` `.webp` `.bmp` | OCR |

### Pluggable OCR (two engines)

| Backend | Cost | When |
| --- | --- | --- |
| `tesseract` (default) | CPU, lightweight, free | almost always. Requires `brew install tesseract tesseract-lang` |
| `unlimited` | NVIDIA GPU + CUDA 12.9-13 | long/complex scans and you have a GPU. [Baidu Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) |

The backend is chosen with `index --ocr tesseract|unlimited`. The interface lives
in `style_rag/ingest/ocr.py`: adding a new engine means implementing `OCRBackend`,
without touching the pipeline.

> **Important:** OCR solves "image → text". It does NOT replace *chunking*.
> Chunking splits the text so retrieval can find the relevant fragment; it's the
> mechanism that makes the RAG work, not a limitation.

## The pipeline (each step, one concept)

1. **Ingest** — any format → plain text (`style_rag/ingest/`).
2. **Chunking** — split into ~120-word fragments with overlap.
3. **Embeddings** — each chunk → vector with `sentence-transformers` (local).
4. **Index** — vectors into a `.npz` per profile (no database).
5. **Retrieval** — for your topic, the most similar fragments by cosine.
6. **Generation** — prompt with those examples → generate with **Ollama**.

## Getting started

```bash
# 1. Base dependencies (CPU, free)
pip install -r requirements.txt
#    For OCR with tesseract:  brew install tesseract tesseract-lang

# 2. Create a profile
python rag_style.py profile create profe-mate \
  --desc "explains with analogies" \
  --metodo "Starts with an everyday scene. Analogy before definition. Closes by cementing the concept."

# 3. Ingest files (any format) into the profile
python rag_style.py ingest profe-mate ./notes/*.pdf ./photos/*.jpg

# 4. Build the index
python rag_style.py index profe-mate                 # tesseract by default
# python rag_style.py index profe-mate --ocr unlimited   # if you have a GPU

# 5. See WHAT it retrieves (no Ollama needed) — the most educational step
python rag_style.py retrieve profe-mate "how to explain derivatives"

# 6. Generate the explanation in that style + method (needs Ollama)
python rag_style.py explain profe-mate "how to explain derivatives"
```

For step 6 you need [Ollama](https://ollama.com) and a model:

```bash
ollama pull llama3.1   # or whatever you have, e.g. llama3.2:3b
```

## Long texts (plan → expand → edit)

`explain` is for a short explanation. For a report of thousands of words,
generating in one shot does NOT work: the model runs out of tokens, forgets what
it said above and repeats itself. That's why long texts are **built**, not
generated, in three stages (`style_rag/longform.py`):

1. **Plan** — an *outline* with thesis + sections; each section gets a **unique
   angle** and a word budget. The unique angle prevents sections from overlapping
   → less repetition.
2. **Expand** — section by section. Each receives the global thesis, a **rolling
   summary** of what's already written ("this was already said, don't repeat it;
   connect with this") and style+method examples retrieved **for that section**.
3. **Edit** — a per-section coherence pass that polishes transitions and removes
   residual repetition (skippable with `--no-edit`).

```bash
# One-phase flow (automatic)
python rag_style.py compose profe-mate "report on world peace" \
  --words 10000 --auto --model llama3.1 -o report.md

# Two-phase flow (review the plan before spending 10k words)
python rag_style.py outline profe-mate "report on world peace" \
  --words 10000 -o plan.md
#   ... edit plan.md as you wish ...
python rag_style.py compose profe-mate "report on world peace" \
  --from-outline plan.md -o report.md

# Without --auto and without --from-outline: it generates the outline, shows it
# to you and asks for confirmation.
```

> **The bottleneck is the model, not the scaffolding.** The pipeline keeps the
> structure and the thread, but a small model (e.g. 3B) repeats phrases and
> sometimes leaks words from the examples. For quality long texts use `--model`
> with a bigger model.

## The experiment that teaches the concept

```bash
python rag_style.py explain profe-mate "what is a variable"
python rag_style.py explain profe-mate "what is a variable" --random
```

With `--random` the model receives examples from the profile **unrelated to the
topic**. The style is kept, but the method loses focus. That difference *is* the
value of retrieval.

## Things to experiment with

- `CHUNK_WORDS` / `CHUNK_OVERLAP` in `style_rag/config.py`: do smaller chunks
  retrieve better?
- `TOP_K`: do more examples help or confuse?
- The real prompt: `python rag_style.py explain profile "..." --show-prompt`.
- For Spanish, set `"embed_model": "paraphrase-multilingual-MiniLM-L12-v2"` in
  `profile.json`.

## Structure

```
few-shot-retrieval/
├── rag_style.py              # entrypoint (thin) → style_rag.cli
├── requirements.txt
├── style_rag/                # one module per pipeline concept
│   ├── config.py
│   ├── profiles.py
│   ├── ingest/               # text · pdf · ocr (pluggable) · dispatcher
│   ├── chunking.py
│   ├── embeddings.py
│   ├── index.py
│   ├── retrieval.py
│   ├── generation.py         # style + didactic-method prompt (short)
│   ├── longform.py           # long texts: plan → expand → edit
│   └── cli.py
└── profiles/
    └── demo-divulgador/      # example profile, already with texts
```

## Commands (quick reference)

| Command | What it does |
| --- | --- |
| `profile create <name> [--desc ...] [--metodo ...]` | create a writing profile |
| `profile list` | list profiles and whether they're indexed |
| `ingest <profile> <files...>` | copy files (any format) into the profile's corpus |
| `index <profile> [--ocr tesseract\|unlimited] [--lang spa+eng]` | build the index (extract + chunk + embed) |
| `retrieve <profile> "topic" [--random]` | show retrieved fragments (no generation) |
| `explain <profile> "topic" [--random] [--show-prompt]` | generate a short explanation in the style+method |
| `outline <profile> "topic" --words N [-o plan.md]` | generate only the plan/structure of a long text |
| `compose <profile> "topic" --words N [--auto] [--from-outline f] [--no-edit] [--model M] [-o out.md]` | generate a coherent long text |

## Requirements

- **Python 3.9+**.
- **Base** (CPU, free): `sentence-transformers`, `numpy`, `requests`.
- **PDF/image ingestion** (optional): `pymupdf`, and for OCR `pytesseract` + the
  `tesseract` binary (`brew install tesseract tesseract-lang`).
- **Generation**: [Ollama](https://ollama.com) running, with a model pulled
  (`ollama pull llama3.1`). The `index`, `retrieve` and `outline` steps do NOT
  need Ollama; `explain` and `compose` do.

## License

MIT. If you publish it, add a `LICENSE` file with the text of the license you
choose.
