"""PDF extractor, with automatic fallback to OCR.

The point: a PDF may have a TEXT LAYER (selectable) or be a SCAN (page images).
You don't always know in advance. So we try to extract text page by page; if a
page has almost no text, we assume it's a scan and render it to an image to send
to OCR.

This way a mixed PDF (some digital pages, some scanned) ingests cleanly without
you having to classify it by hand.
"""

from pathlib import Path

from .. import config


def extract_pdf(path: Path, ocr_backend=None,
                min_chars: int = config.PDF_OCR_MIN_CHARS,
                dpi: int = config.PDF_RENDER_DPI) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError as e:
        raise RuntimeError(
            "Falta PyMuPDF para leer PDFs. Instalá:  pip install pymupdf"
        ) from e

    doc = fitz.open(path)
    parts = []
    for page in doc:
        text = page.get_text().strip()
        if len(text) < min_chars:
            # Page without usable text layer -> probably scanned -> OCR.
            if ocr_backend is None:
                continue
            ok, msg = ocr_backend.available()
            if not ok:
                raise RuntimeError(
                    f"La página {page.number + 1} de '{path.name}' parece escaneada "
                    f"y necesita OCR, pero el backend no está disponible:\n  {msg}"
                )
            from PIL import Image
            pix = page.get_pixmap(dpi=dpi)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            text = ocr_backend.ocr(img)
        if text:
            parts.append(text)
    doc.close()
    return "\n\n".join(parts).strip()
