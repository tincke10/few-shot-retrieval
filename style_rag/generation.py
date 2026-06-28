"""GENERATION: assemble the prompt and generate with Ollama.

This is where the project's most important conceptual shift lives. A "style"
prompt copies the SURFACE (tone, vocabulary, punctuation). But we want something
deeper: to replicate the author's DIDACTIC RESOLUTION ALGORITHM. That is, not just
HOW they write, but HOW they teach:

    - how they frame the problem before solving it,
    - which analogies they use to bring the abstract down to earth,
    - in what ORDER they take the idea apart,
    - how they build toward the "aha" moment,
    - how they close and cement what was learned.

That's why this prompt, unlike a classic style transfer, DOES allow using the
method and structure of the examples. The content is new; the method is borrowed.

NOTE: the prompt strings below are intentionally in Spanish — they drive the
model to produce Spanish output. Translating them would change the output language.
"""

from . import config
from .profiles import Profile


def build_prompt(query: str, examples: list[dict], metodo: str = "") -> str:
    bloques = "\n\n".join(
        f"--- Ejemplo {i + 1} ({e['source']}) ---\n{e['text']}"
        for i, e in enumerate(examples)
    )

    metodo_block = ""
    if metodo.strip():
        metodo_block = (
            "\n\nMÉTODO DECLARADO DEL AUTOR (respetalo además de lo que observes):\n"
            f"{metodo.strip()}\n"
        )

    return f"""Sos un DOCENTE que explica un tema nuevo imitando a otro autor.

No imitás solo CÓMO escribe (tono, vocabulario, largo de frase, puntuación, \
forma de dirigirse al lector). Imitás sobre todo CÓMO ENSEÑA: su algoritmo de \
resolución didáctico. Observá en los ejemplos:
  - cómo encuadra el problema antes de resolverlo,
  - qué analogías o metáforas usa para bajar lo abstracto a lo concreto,
  - en qué ORDEN desarma la idea (de qué parte arranca y hacia dónde va),
  - cómo construye hacia el momento "aha",
  - cómo cierra y fija lo aprendido.

Replicá ESE esqueleto de razonamiento aplicado al tema nuevo. El CONTENIDO es \
nuevo; el MÉTODO y el ESTILO son prestados de los ejemplos. No copies frases \
literales de los ejemplos: copiá su forma de pensar y de enseñar.{metodo_block}

EJEMPLOS (muestras de estilo Y de método didáctico):
{bloques}

TEMA A EXPLICAR (en ese mismo estilo y con ese mismo método):
{query}

EXPLICACIÓN (solo el resultado, sin meta-comentarios ni aclaraciones sobre el método):"""


def generate_with_ollama(prompt: str, model: str = config.OLLAMA_MODEL):
    """Generate with Ollama. Returns None if Ollama isn't running.

    If Ollama responds but the model isn't pulled (404), raise a RuntimeError with
    the detail, because the fix is NOT "start Ollama" but "pull the model": they
    are different problems and deserve different messages.
    """
    import requests
    try:
        resp = requests.post(
            config.OLLAMA_URL,
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=300,
        )
    except requests.exceptions.ConnectionError:
        return None  # Ollama isn't running

    if resp.status_code == 404:
        detail = ""
        try:
            detail = resp.json().get("error", "")
        except Exception:
            pass
        raise RuntimeError(
            f"Ollama está corriendo pero el modelo '{model}' no está disponible"
            + (f" ({detail})" if detail else "") + ".\n"
            f"  Descargalo con:  ollama pull {model}"
        )
    resp.raise_for_status()
    return resp.json().get("response", "").strip()
