"""RETRIEVAL: for a topic, bring the most similar chunks from the profile.

This is 90% of a RAG. If you retrieve the right fragments, the model barely has to
do any magic. The `random` mode exists ONLY for comparison: it lets you see how
much worse the style comes out when the examples aren't relevant to the topic.
"""

import numpy as np

from . import config
from .embeddings import embed
from .index import load_index
from .profiles import Profile


def retrieve(profile: Profile, query: str, k: int = config.TOP_K,
             random_mode: bool = False) -> list[dict]:
    vectors, chunks, sources = load_index(profile)

    if random_mode:
        idx = np.random.choice(len(chunks), size=min(k, len(chunks)), replace=False)
        scores = [float("nan")] * len(idx)
    else:
        qvec = embed([query], model_name=profile.embed_model)[0]
        sims = vectors @ qvec               # cosine similarity with each chunk
        idx = np.argsort(-sims)[:k]         # the top k
        scores = sims[idx]

    results = []
    for rank, i in enumerate(idx):
        results.append({
            "rank": rank + 1,
            "score": float(scores[rank]),
            "source": str(sources[i]),
            "text": str(chunks[i]),
        })
    return results
