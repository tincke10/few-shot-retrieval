"""Ingestion dispatcher: file -> plain text, regardless of format.

The rest of the pipeline only calls `extract_text(path)` and gets text back. It
neither knows nor cares whether it came from a .md, a digital PDF, or a photo run
through OCR. That indifference is what makes the system extensible: adding a new
format means adding an extractor here, nothing else.
"""

from pathlib import Path

TEXT_EXTS = {".txt", ".md", ".markdown"}
PDF_EXTS = {".pdf"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp", ".bmp", ".gif"}

SUPPORTED_EXTS = TEXT_EXTS | PDF_EXTS | IMAGE_EXTS


def is_supported(path: Path) -> bool:
    return path.suffix.lower() in SUPPORTED_EXTS


def extract_text(path: Path, ocr_backend=None) -> str:
    """Dispatch by extension. `ocr_backend` is only used for images/scans."""
    ext = path.suffix.lower()

    if ext in TEXT_EXTS:
        from .text import extract_text_file
        return extract_text_file(path)

    if ext in PDF_EXTS:
        from .pdf import extract_pdf
        return extract_pdf(path, ocr_backend=ocr_backend)

    if ext in IMAGE_EXTS:
        if ocr_backend is None:
            raise RuntimeError(
                f"'{path.name}' es una imagen y necesita OCR, pero no se pasó backend."
            )
        ok, msg = ocr_backend.available()
        if not ok:
            raise RuntimeError(f"OCR no disponible para '{path.name}':\n  {msg}")
        from PIL import Image
        with Image.open(path) as img:
            return ocr_backend.ocr(img.convert("RGB"))

    raise ValueError(f"Formato no soportado: '{path.suffix}' ({path.name})")
