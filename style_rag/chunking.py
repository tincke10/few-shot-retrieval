"""CHUNKING: split text into manageable fragments, with overlap.

Why chunk (and why you can't skip it): the embedding model truncates at a few
hundred tokens. A whole document = a single mushy vector that loses everything.
To retrieve the fragment RELEVANT to the topic you need granularity.

Why overlap: if you cut hard, an idea that falls right on the boundary gets split
and no chunk captures it. Overlap makes each chunk share context with the next.
"""

from . import config


def chunk_text(text: str, size: int = config.CHUNK_WORDS,
               overlap: int = config.CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    step = max(1, size - overlap)
    for start in range(0, len(words), step):
        piece = " ".join(words[start:start + size])
        if piece.strip():
            chunks.append(piece)
        if start + size >= len(words):
            break
    return chunks
