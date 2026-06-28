"""INDEX: build and save a profile's vector index.

Glues together ingestion (any format -> text), chunking and embeddings, and leaves
everything in a single .npz per profile. No database: for small corpora (which is
the case for a style profile) a numpy array is more than enough.
"""

import sys

import numpy as np

from . import config
from .chunking import chunk_text
from .embeddings import embed
from .ingest import extract_text, is_supported
from .ingest.ocr import get_ocr_backend
from .profiles import Profile


def _collect_documents(profile: Profile, ocr_backend):
    """Read every supported file from the profile's documents/ folder."""
    docs = []
    if not profile.documents_dir.exists():
        return docs
    for path in sorted(profile.documents_dir.iterdir()):
        if not path.is_file() or not is_supported(path):
            continue
        if path.name.lower().startswith("ejemplo"):
            continue  # ignore example files shipped with the project
        try:
            text = extract_text(path, ocr_backend=ocr_backend)
        except Exception as e:
            print(f"  ! No pude ingerir '{path.name}': {e}", file=sys.stderr)
            continue
        if text.strip():
            docs.append((path.name, text))
    return docs


def build_index(profile: Profile, ocr_backend_name: str = config.OCR_BACKEND,
                ocr_lang: str = config.OCR_LANG) -> int:
    ocr_backend = get_ocr_backend(ocr_backend_name, lang=ocr_lang)
    docs = _collect_documents(profile, ocr_backend)
    if not docs:
        raise RuntimeError(
            f"No hay documentos ingeribles en {profile.documents_dir}.\n"
            "Poné archivos (.txt/.md/.pdf/imágenes) y volvé a indexar."
        )

    chunks, sources = [], []
    for name, text in docs:
        for c in chunk_text(text):
            chunks.append(c)
            sources.append(name)

    print(f"{len(docs)} documento(s) -> {len(chunks)} chunks. Generando embeddings...")
    vectors = embed(chunks, model_name=profile.embed_model)

    np.savez(
        profile.index_path,
        vectors=vectors,
        chunks=np.array(chunks, dtype=object),
        sources=np.array(sources, dtype=object),
    )
    return len(chunks)


def load_index(profile: Profile):
    if not profile.index_path.exists():
        raise FileNotFoundError(
            f"El perfil '{profile.name}' no tiene índice todavía. Corré:\n"
            f"  python rag_style.py index {profile.name}"
        )
    data = np.load(profile.index_path, allow_pickle=True)
    return data["vectors"], data["chunks"], data["sources"]
