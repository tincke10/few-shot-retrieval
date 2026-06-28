"""Pluggable OCR. One interface, several engines.

The key idea: the rest of the system must NOT know which OCR engine you use. It
asks an OCRBackend to turn an image into text and that's it. Today you have
Tesseract (CPU, lightweight) and a scaffold for Unlimited-OCR (GPU). Tomorrow you
can plug in another without touching the pipeline. This is dependency inversion:
the pipeline depends on the ABSTRACTION (OCRBackend), not the concrete engine.
"""

from abc import ABC, abstractmethod


class OCRBackend(ABC):
    """Contract every OCR engine must satisfy."""

    name: str = "abstract"

    @abstractmethod
    def available(self) -> tuple[bool, str]:
        """(ok, message). If ok=False, the message explains how to install it."""

    @abstractmethod
    def ocr(self, image) -> str:
        """Takes a PIL.Image and returns the recognized text."""


# --------------------------------------------------------------------------
# Tesseract: CPU, lightweight, free. The default.
# --------------------------------------------------------------------------
class TesseractBackend(OCRBackend):
    name = "tesseract"

    def __init__(self, lang: str = "spa+eng"):
        self.lang = lang

    def available(self) -> tuple[bool, str]:
        try:
            import pytesseract  # noqa: F401
        except ImportError:
            return False, "Falta pytesseract. Instalá:  pip install pytesseract pillow"
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
        except Exception:
            return False, (
                "Falta el binario de tesseract. En macOS:\n"
                "  brew install tesseract tesseract-lang"
            )
        return True, "ok"

    def ocr(self, image) -> str:
        import pytesseract
        return pytesseract.image_to_string(image, lang=self.lang).strip()


# --------------------------------------------------------------------------
# Unlimited-OCR (Baidu): NVIDIA GPU + CUDA. Optional scaffold.
# --------------------------------------------------------------------------
class UnlimitedOCRBackend(OCRBackend):
    """Scaffold for Baidu's model (https://github.com/baidu/Unlimited-OCR).

    NOTE: requires an NVIDIA GPU with CUDA 12.9-13, torch 2.10 and
    transformers 4.57. The base project runs on CPU; this backend deliberately
    breaks that premise, so only use it if you have a GPU and long/complex scans.

    Model loading and the exact inference call depend on the repo version, so they
    are loaded lazily. If the repo changes its API, this is the ONLY file you touch.
    """

    name = "unlimited"

    def __init__(self, model_id: str = "baidu/Unlimited-OCR"):
        self.model_id = model_id
        self._model = None
        self._processor = None

    def available(self) -> tuple[bool, str]:
        try:
            import torch
        except ImportError:
            return False, "Falta torch. Seguí las instrucciones del repo baidu/Unlimited-OCR."
        if not torch.cuda.is_available():
            return False, (
                "Unlimited-OCR necesita GPU NVIDIA (CUDA). No se detectó CUDA.\n"
                "Usá el backend 'tesseract' para CPU."
            )
        try:
            import transformers  # noqa: F401
        except ImportError:
            return False, "Falta transformers>=4.57. Seguí el README de baidu/Unlimited-OCR."
        return True, "ok"

    def _load(self):
        if self._model is not None:
            return
        from transformers import AutoModel, AutoProcessor
        self._processor = AutoProcessor.from_pretrained(
            self.model_id, trust_remote_code=True
        )
        self._model = AutoModel.from_pretrained(
            self.model_id, trust_remote_code=True
        ).eval().cuda()

    def ocr(self, image) -> str:
        ok, msg = self.available()
        if not ok:
            raise RuntimeError(msg)
        self._load()
        # NOTE: the exact inference signature is defined by Baidu's repo.
        # We keep the integration point isolated here; adapt it to their snippet.
        inputs = self._processor(images=image, return_tensors="pt").to("cuda")
        output = self._model.generate(**inputs)
        return self._processor.batch_decode(output, skip_special_tokens=True)[0].strip()


# --------------------------------------------------------------------------
# Factory
# --------------------------------------------------------------------------
def get_ocr_backend(name: str, lang: str = "spa+eng") -> OCRBackend:
    name = (name or "tesseract").lower()
    if name == "tesseract":
        return TesseractBackend(lang=lang)
    if name in ("unlimited", "unlimited-ocr", "baidu"):
        return UnlimitedOCRBackend()
    raise ValueError(f"Backend de OCR desconocido: '{name}'. Usá 'tesseract' o 'unlimited'.")
