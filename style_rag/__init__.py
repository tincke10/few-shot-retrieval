"""Style + didactic-method RAG, organized by PROFILES.

A classic RAG retrieves DATA to answer a question. Here we retrieve EXAMPLES:
fragments of an author's texts that resemble the requested topic. Those fragments
condition the model so it writes with the same style AND the same didactic method
(the "resolution algorithm" the author uses to teach).

The pipeline, layer by layer:

    ingest     -> extract text from ANY format (.txt/.md/.pdf/image).
    chunking   -> split that text into manageable fragments.
    embeddings -> turn each chunk into a vector.
    index      -> store the vectors on disk (one .npz per profile).
    retrieval  -> bring the chunks most similar to the topic (cosine).
    generation -> assemble the prompt and generate (Ollama).

Everything is organized by PROFILE: each profile has its own corpus and index,
so you can have "math-teacher", "science-popularizer", "coding-tutor", each with
its own voice and way of teaching.
"""

__version__ = "0.2.0"
