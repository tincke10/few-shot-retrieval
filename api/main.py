"""HTTP API: the SECOND delivery layer over the style_rag core.

Just like `cli.py`, this file has no business logic. It is a thin adapter that
maps HTTP requests to the same pure functions in the `style_rag` package, so the
CLI and the web UI stay in sync by construction — change the core once, both win.

It serves TWO contracts over the same core:
  * /api/*  — used by the React MVP in web/
  * root    — the "Scrivo" standalone (scrivo.html): /profiles, /models, /health,
              /generate, POST /profiles (multipart ingest)

Run it from the project root:
    pip install -r api/requirements.txt
    uvicorn api.main:app --reload --port 8000
"""

import json
from pathlib import Path

import numpy as np
import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from style_rag import config
from style_rag.generation import build_prompt, generate_with_ollama_stream
from style_rag.index import build_index
from style_rag.ingest import is_supported
from style_rag.profiles import _slug, create_profile, list_profiles, load_profile
from style_rag.retrieval import retrieve

app = FastAPI(title="Style RAG API", version="0.2.0")

# Local dev tool: allow any origin so the standalone scrivo.html works whether
# it's opened from file:// (Origin: null) or served from any localhost port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_TAGS_URL = config.OLLAMA_URL.replace("/api/generate", "/api/tags")


# --- helpers -------------------------------------------------------------
def _sse(payload) -> str:
    """Format one Server-Sent Event data frame."""
    if isinstance(payload, str):
        return f"data: {payload}\n\n"
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _examples_count(prof) -> int:
    """Number of few-shot chunks in a profile's index (0 if not built)."""
    if not prof.index_path.exists():
        return 0
    try:
        data = np.load(prof.index_path, allow_pickle=True)
        return int(len(data["sources"]))
    except Exception:
        return 0


def _ollama_up() -> bool:
    try:
        return requests.get(OLLAMA_TAGS_URL, timeout=3).ok
    except requests.exceptions.RequestException:
        return False


# --- models --------------------------------------------------------------
class RetrieveBody(BaseModel):
    profile: str
    query: str
    random: bool = False


class ExplainBody(BaseModel):
    profile: str
    query: str
    random: bool = False


class GenerateBody(BaseModel):
    profileId: str
    prompt: str
    model: str | None = None
    temperature: float | None = None
    retrievalTopK: int | None = None
    maxTokens: int | None = None


# =========================================================================
#  Scrivo contract (root paths)
# =========================================================================
@app.get("/health")
def health():
    return {"ok": True, "ollama": _ollama_up()}


@app.get("/models")
def models():
    """List the models Ollama has pulled; fall back to a sensible default list."""
    try:
        r = requests.get(OLLAMA_TAGS_URL, timeout=3)
        r.raise_for_status()
        names = [m["name"] for m in r.json().get("models", [])]
        if names:
            return names
    except (requests.exceptions.RequestException, KeyError, ValueError):
        pass
    return ["llama3.1", "llama3.2", "mistral", "qwen2.5", "phi3"]


@app.get("/profiles")
def get_profiles_scrivo():
    """Scrivo shape: [{ id, name, description, examplesCount }]."""
    return [
        {
            "id": p.name,
            "name": p.name,
            "description": p.description,
            "examplesCount": _examples_count(p),
        }
        for p in list_profiles()
    ]


@app.post("/profiles")
async def create_profile_scrivo(
    name: str = Form(...),
    description: str = Form(""),
    files: list[UploadFile] = File(default=[]),
):
    """Create a profile from uploaded files: save -> index. Returns { id, ... }."""
    base = _slug(name)
    if not base:
        raise HTTPException(status_code=400, detail="Nombre de perfil inválido.")

    # Find a free slug so we never clobber an existing profile.
    candidate, n = base, 2
    while (config.PROFILES_DIR / candidate / "profile.json").exists():
        candidate, n = f"{base}-{n}", n + 1

    desc = description.strip() or f"Voz creada a partir de {len(files)} archivo(s)."
    prof = create_profile(candidate, description=desc)

    saved, skipped = 0, []
    for uf in files:
        fname = Path(uf.filename or "").name
        if not fname:
            continue
        dest = prof.documents_dir / fname
        if not is_supported(dest):
            skipped.append(fname)
            continue
        dest.write_bytes(await uf.read())
        saved += 1

    if saved == 0:
        # Nothing usable — clean up the empty profile we just made.
        import shutil
        shutil.rmtree(prof.root, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail="Ningún archivo soportado (.txt/.md/.pdf/imágenes). "
            + (f"Omitidos: {', '.join(skipped)}" if skipped else ""),
        )

    try:
        count = build_index(prof)
    except RuntimeError as e:
        import shutil
        shutil.rmtree(prof.root, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": prof.name,
        "name": prof.name,
        "description": prof.description,
        "examplesCount": count,
    }


@app.post("/generate")
def generate(body: GenerateBody):
    """Retrieve few-shot examples, then stream the generation as SSE.

    Emits `data: {"retrieved": [...]}` first, then `data: {"token": "..."}` per
    token, then `data: [DONE]`. Matches the contract scrivo.html consumes.
    """
    try:
        prof = load_profile(body.profileId)
        k = body.retrievalTopK or config.TOP_K
        examples = retrieve(prof, body.prompt, k=k)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Pre-flight: if Ollama is down, fail BEFORE streaming so the client's catch
    # can show the error (mid-stream errors are harder to surface over SSE).
    if not _ollama_up():
        raise HTTPException(
            status_code=503,
            detail="Ollama no responde en http://localhost:11434. "
            "Instalalo (https://ollama.com), corré `ollama serve` y descargá un "
            f"modelo con `ollama pull {config.OLLAMA_MODEL}`.",
        )

    prompt = build_prompt(body.prompt, examples, metodo=prof.metodo)
    model = body.model or config.OLLAMA_MODEL

    def stream():
        retrieved = [
            {"source": e["source"], "text": e["text"], "score": e["score"]}
            for e in examples
        ]
        yield _sse({"retrieved": retrieved})
        try:
            for token in generate_with_ollama_stream(
                prompt, model=model,
                temperature=body.temperature, max_tokens=body.maxTokens,
            ):
                yield _sse({"token": token})
            yield _sse("[DONE]")
        except requests.exceptions.ConnectionError:
            yield _sse({"output": "⚠ Se perdió la conexión con Ollama a mitad de la generación."})
        except RuntimeError as e:
            yield _sse({"output": f"⚠ {e}"})

    return StreamingResponse(stream(), media_type="text/event-stream")


# =========================================================================
#  /api/* contract (React MVP in web/)
# =========================================================================
@app.get("/api/profiles")
def get_profiles():
    out = []
    for p in list_profiles():
        n_docs = (
            len([f for f in p.documents_dir.glob("*") if f.is_file()])
            if p.documents_dir.exists() else 0
        )
        out.append({
            "name": p.name,
            "description": p.description,
            "indexed": p.index_path.exists(),
            "n_docs": n_docs,
        })
    return out


@app.post("/api/retrieve")
def post_retrieve(body: RetrieveBody):
    try:
        prof = load_profile(body.profile)
        return {"results": retrieve(prof, body.query, random_mode=body.random)}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.post("/api/explain")
def post_explain(body: ExplainBody):
    try:
        prof = load_profile(body.profile)
        examples = retrieve(prof, body.query, random_mode=body.random)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=409, detail=str(e))

    prompt = build_prompt(body.query, examples, metodo=prof.metodo)

    def event_stream():
        yield _sse({"type": "examples", "examples": examples})
        try:
            for token in generate_with_ollama_stream(prompt):
                yield _sse({"type": "token", "token": token})
            yield _sse({"type": "done"})
        except requests.exceptions.ConnectionError:
            yield _sse({
                "type": "error",
                "message": (
                    "No me pude conectar a Ollama (http://localhost:11434). "
                    "Instalalo en https://ollama.com, descargá un modelo con "
                    f"'ollama pull {config.OLLAMA_MODEL}' y asegurate de que esté corriendo."
                ),
            })
        except RuntimeError as e:
            yield _sse({"type": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
