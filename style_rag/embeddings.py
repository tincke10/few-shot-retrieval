"""EMBEDDINGS: text -> vector. The translation into "meaning coordinates".

We normalize to L2 norm = 1 so the dot product IS already the cosine similarity:
cos(a, b) = a · b when |a| = |b| = 1. That reduces retrieval to a single matrix
multiplication.
"""

import sys

import numpy as np

from . import config

_model_cache = {}


def get_embedder(model_name: str = config.DEFAULT_EMBED_MODEL):
    """Load the model only once per name (this is the slowest part)."""
    if model_name not in _model_cache:
        from sentence_transformers import SentenceTransformer
        print(f"Cargando modelo de embeddings '{model_name}'...", file=sys.stderr)
        _model_cache[model_name] = SentenceTransformer(model_name)
    return _model_cache[model_name]


def embed(texts, model_name: str = config.DEFAULT_EMBED_MODEL) -> np.ndarray:
    model = get_embedder(model_name)
    vecs = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms == 0] = 1e-9
    return vecs / norms
