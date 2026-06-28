"""Central configuration. One single place to tweak parameters.

Why centralize: if magic numbers are scattered all over the code, changing the
chunk size forces you to grep and pray. Not here.
"""

from pathlib import Path

# --- Paths ---------------------------------------------------------------
PACKAGE_DIR = Path(__file__).resolve().parent
ROOT = PACKAGE_DIR.parent
PROFILES_DIR = ROOT / "profiles"   # each profile lives in a subfolder here

# --- Embeddings ----------------------------------------------------------
# all-MiniLM-L6-v2 is small, fast and runs on CPU. For pure Spanish, try
# 'paraphrase-multilingual-MiniLM-L12-v2' (set per profile in profile.json).
# NOTE: this model truncates at ~256 tokens. That's why chunking is NOT optional.
DEFAULT_EMBED_MODEL = "all-MiniLM-L6-v2"

# --- Generation (Ollama, local and free) ---------------------------------
OLLAMA_MODEL = "llama3.1"
OLLAMA_URL = "http://localhost:11434/api/generate"

# --- Chunking ------------------------------------------------------------
CHUNK_WORDS = 120     # chunk size in words (try changing it!)
CHUNK_OVERLAP = 30    # words that overlap between neighboring chunks
TOP_K = 4             # how many examples to retrieve

# --- OCR / ingestion -----------------------------------------------------
# Default OCR backend: 'tesseract' (CPU, lightweight) or 'unlimited' (GPU).
OCR_BACKEND = "tesseract"
OCR_LANG = "spa+eng"   # tesseract language packs (brew install tesseract-lang)
# If a PDF page has fewer than this many text characters, we assume it's a
# scanned image and send it to OCR.
PDF_OCR_MIN_CHARS = 20
PDF_RENDER_DPI = 200
