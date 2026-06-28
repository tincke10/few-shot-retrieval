"""LONGFORM: generate coherent long texts (plan -> expand -> edit).

The problem it solves: an LLM can't write 10k coherent words in one shot. It runs
out of tokens, forgets what it said above, repeats itself and loses the thread.
The solution is NOT to generate, but to BUILD:

    1. PLAN   -> an outline with thesis + sections, each with a UNIQUE ANGLE and a
                 word budget. The unique angle kills repetition at the root: if two
                 sections don't overlap, they don't step on each other.
    2. EXPAND -> section by section, each receiving (a) the global thesis,
                 (b) a ROLLING SUMMARY of what's already written ("this was already
                 said, don't repeat it; connect with this") and (c) style+method
                 examples retrieved FOR THAT section. The rolling summary is the thread.
    3. EDIT   -> a per-section coherence pass: polishes the opening transition and
                 removes residual repetition.

Everything is conditioned on the PROFILE: voice and didactic method come from
retrieval.

NOTE: the prompt strings below are intentionally in Spanish — they drive the model
to produce Spanish output.
"""

import re
import sys

from . import config
from .generation import generate_with_ollama
from .profiles import Profile
from .retrieval import retrieve


# --------------------------------------------------------------------------
# LLM helper
# --------------------------------------------------------------------------
def _llm(prompt: str, model: str) -> str:
    out = generate_with_ollama(prompt, model=model)
    if out is None:
        raise RuntimeError(
            "No me pude conectar a Ollama (http://localhost:11434). "
            "Prendelo y reintentá."
        )
    return out.strip()


def _log(msg: str) -> None:
    print(msg, file=sys.stderr)


# --------------------------------------------------------------------------
# 1) PLAN — outline
# --------------------------------------------------------------------------
def _section_count(target_words: int) -> tuple[int, int]:
    """Section range based on length (we aim for ~700 words/section)."""
    approx = max(3, round(target_words / 700))
    return max(3, approx - 2), approx + 2


def build_outline(profile: Profile, topic: str, target_words: int,
                  model: str = config.OLLAMA_MODEL) -> dict:
    n_min, n_max = _section_count(target_words)
    voice = f" Tené en cuenta que el texto será en este registro: {profile.description}." \
        if profile.description else ""

    prompt = f"""Sos un arquitecto de contenidos. Diseñá la ESTRUCTURA de un texto \
de aproximadamente {target_words} palabras sobre el siguiente tema:

TEMA: {topic}

Reglas:
- Definí una TESIS o hilo conductor en una sola frase, que atraviese TODO el texto.
- Dividilo en entre {n_min} y {n_max} secciones.
- Cada sección debe tener un ÁNGULO DISTINTO: algo que esa sección aborda y que
  ninguna otra aborda. Esto es clave para que el texto no se repita.
- Asigná a cada sección un presupuesto de palabras (la suma ~= {target_words}).
- Las secciones deben seguir un orden lógico, de modo que cada una se apoye en la
  anterior.{voice}

Respondé EXACTAMENTE en este formato, sin texto extra:

TESIS: <una frase>
## <título de la sección 1> | <palabras>
ANGULO: <qué aborda esta sección que ninguna otra aborda>
PUNTOS: <punto a desarrollar>; <punto>; <punto>
## <título de la sección 2> | <palabras>
ANGULO: ...
PUNTOS: ...
"""
    raw = _llm(prompt, model)
    outline = parse_outline(raw)
    if not outline["sections"]:
        raise RuntimeError(
            "El modelo no devolvió un outline parseable. Probá de nuevo o con "
            "un modelo más grande (--model). Salida cruda:\n" + raw[:500]
        )
    _normalize_budgets(outline, target_words)
    return outline


def parse_outline(raw: str) -> dict:
    """Parse the delimited format leniently (small models fail strict JSON, so we
    do NOT use JSON)."""
    thesis = ""
    m = re.search(r"TESIS\s*:\s*(.+)", raw, flags=re.IGNORECASE)
    if m:
        thesis = m.group(1).strip()

    sections = []
    # Each block starts with "## title | words"
    blocks = re.split(r"(?m)^\s*#{1,4}\s+", raw)
    for block in blocks:
        block = block.strip()
        if not block or block.upper().startswith("TESIS"):
            continue
        head, *rest = block.splitlines()
        title, words = head, 0
        if "|" in head:
            title, _, w = head.rpartition("|")
            title = title.strip()
            digits = re.search(r"\d+", w)
            words = int(digits.group()) if digits else 0
        body = "\n".join(rest)
        angle = ""
        am = re.search(r"ANGULO\s*:\s*(.+)", body, flags=re.IGNORECASE)
        if am:
            angle = am.group(1).strip()
        points = []
        pm = re.search(r"PUNTOS\s*:\s*(.+)", body, flags=re.IGNORECASE)
        if pm:
            points = [p.strip() for p in re.split(r"[;\n]", pm.group(1)) if p.strip()]
        if title:
            sections.append({"title": title, "words": words,
                             "angle": angle, "points": points})
    return {"thesis": thesis, "sections": sections}


def _normalize_budgets(outline: dict, target_words: int) -> None:
    secs = outline["sections"]
    total = sum(s["words"] for s in secs)
    if total <= 0:
        even = max(150, target_words // len(secs))
        for s in secs:
            s["words"] = even
    else:
        factor = target_words / total
        for s in secs:
            s["words"] = max(150, round(s["words"] * factor))


def outline_to_markdown(outline: dict) -> str:
    lines = [f"TESIS: {outline['thesis']}", ""]
    for s in outline["sections"]:
        lines.append(f"## {s['title']} | {s['words']}")
        if s["angle"]:
            lines.append(f"ANGULO: {s['angle']}")
        if s["points"]:
            lines.append("PUNTOS: " + "; ".join(s["points"]))
        lines.append("")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# 2) EXPAND — section by section
# --------------------------------------------------------------------------
def _examples_block(profile: Profile, query: str, k: int) -> str:
    try:
        examples = retrieve(profile, query, k=k)
    except FileNotFoundError:
        return ""
    return "\n\n".join(
        f"--- Ejemplo {i + 1} ({e['source']}) ---\n{e['text']}"
        for i, e in enumerate(examples)
    )


def expand_section(profile: Profile, topic: str, thesis: str, section: dict,
                   covered: str, prev_tail: str, model: str,
                   k: int = config.TOP_K) -> str:
    query = f"{topic}. {section['title']}. {section['angle']}".strip()
    examples = _examples_block(profile, query, k)
    examples_block = f"\nEJEMPLOS DE ESTILO Y MÉTODO (imitá la voz, no copies el contenido):\n{examples}\n" \
        if examples else ""

    metodo_block = f"\nMÉTODO DEL AUTOR (respetalo): {profile.metodo}\n" \
        if profile.metodo.strip() else ""

    covered_block = f"\nYA SE DIJO ANTES (NO lo repitas; podés referenciarlo brevemente):\n{covered}\n" \
        if covered.strip() else ""

    transition_block = f"\nLA SECCIÓN ANTERIOR TERMINÓ ASÍ (conectá con esto al arrancar):\n\"{prev_tail}\"\n" \
        if prev_tail.strip() else ""

    points = "; ".join(section["points"]) if section["points"] else "(desarrollalo vos)"

    prompt = f"""Estás escribiendo UNA sección de un texto más largo sobre: {topic}

HILO CONDUCTOR de todo el texto (no lo pierdas de vista): {thesis}
{metodo_block}{examples_block}{covered_block}{transition_block}
SECCIÓN: {section['title']}
ÁNGULO (lo que ESTA sección aporta y ninguna otra): {section['angle']}
PUNTOS A DESARROLLAR: {points}
LARGO OBJETIVO: ~{section['words']} palabras. Desarrollá en profundidad hasta \
acercarte a ese largo.

Reglas:
- Imitá el MÉTODO de los ejemplos (cómo encuadra el problema, el ritmo, cómo \
construye hacia el "aha"), NO sus analogías concretas. Inventá analogías PROPIAS \
del tema; no reutilices las analogías ni los términos técnicos de los ejemplos \
(por ejemplo: recursión, escaleras, peldaños, pizzas, "caso base").
- No repitas lo que ya se dijo antes. Conectá con la sección anterior de forma natural.
- Escribí SOLO la prosa de la sección: sin título, sin encabezados markdown, sin \
meta-comentarios ni etiquetas."""
    return _llm(prompt, model)


def update_summary(covered: str, section_title: str, section_text: str,
                   model: str) -> str:
    """Append to the rolling summary the ideas THIS section established."""
    prompt = f"""Resumí en 2 a 4 viñetas cortas las ideas CLAVE que el siguiente \
fragmento dejó establecidas, para no repetirlas más adelante. Solo viñetas, sin \
introducción.

FRAGMENTO (sección "{section_title}"):
{section_text[:2000]}
"""
    bullets = _llm(prompt, model)
    addition = f"\n[{section_title}]\n{bullets}"
    return (covered + addition).strip()


# --------------------------------------------------------------------------
# 3) EDIT — per-section coherence pass
# --------------------------------------------------------------------------
def coherence_pass(section_text: str, prev_tail: str, covered: str,
                   model: str) -> str:
    transition = f"\nLA SECCIÓN ANTERIOR TERMINÓ ASÍ:\n\"{prev_tail}\"\n" \
        if prev_tail.strip() else ""
    covered_block = f"\nIDEAS YA TRATADAS EN SECCIONES PREVIAS:\n{covered}\n" \
        if covered.strip() else ""

    prompt = f"""Editá la siguiente sección para mejorar su coherencia dentro del \
texto. Tareas, SIN cambiar el estilo, SIN acortarla y SIN agregar temas nuevos:
1. Que el primer párrafo conecte de forma fluida con lo anterior.
2. Eliminá frases o ideas que repitan algo ya tratado antes.
3. Mejorá las transiciones internas entre párrafos.
Devolvé SOLO la prosa editada: sin título, sin encabezados markdown, sin etiquetas \
del tipo "SECCIÓN EDITADA", nada más.
{transition}{covered_block}
SECCIÓN A EDITAR:
{section_text}
"""
    return _llm(prompt, model)


def _tail(text: str, n_chars: int = 300) -> str:
    return text.strip()[-n_chars:]


# --------------------------------------------------------------------------
# Output cleanup + length control
# --------------------------------------------------------------------------
# Small models add meta-labels ("SECCIÓN EDITADA"), echo the thesis as a heading
# and use inconsistent heading levels. We strip all that and impose ONE canonical
# "## <title>" per section, so the model's formatting whims never reach the output.
_META_LINE_RE = re.compile(
    r"^\s*\**\s*("
    r"secci[oó]n\s+(?:editada|a\s+editar|\d+)|"
    r"texto\s+editado|resultado|explicaci[oó]n|nota|t[ií]tulo|tesis"
    r")\b.*$",
    re.IGNORECASE,
)
_H1_H2_RE = re.compile(r"^#{1,2}(?!#)\s")  # h1/h2 only; keeps ### sub-headings

SHORT_SECTION_RATIO = 0.7   # below this fraction of the budget -> try to extend
MAX_EXTEND_TRIES = 1        # bounded: long docs already make many LLM calls


def _word_count(text: str) -> int:
    return len(text.split())


def _postprocess_section(text: str, title: str) -> str:
    """Strip model meta-labels and stray headings, then impose a canonical title."""
    kept = []
    for line in text.strip().splitlines():
        s = line.strip()
        if _META_LINE_RE.match(s):
            continue
        if _H1_H2_RE.match(s):
            continue
        kept.append(line)
    body = "\n".join(kept).strip()
    return f"## {title}\n\n{body}".strip()


def _extend_section(text: str, section: dict, topic: str, model: str) -> str:
    prompt = f"""La siguiente sección sobre "{section['title']}" (tema general: \
{topic}) quedó demasiado corta. Reescribila MÁS LARGA, hasta acercarte a \
~{section['words']} palabras, agregando profundidad, ejemplos y matices NUEVOS \
(nada de relleno ni repetir lo que ya dice). Mantené el mismo estilo y tono. \
Devolvé SOLO la prosa, sin título ni encabezados ni etiquetas.

SECCIÓN ACTUAL:
{text}
"""
    return _llm(prompt, model)


# --------------------------------------------------------------------------
# Orchestrator
# --------------------------------------------------------------------------
def compose(profile: Profile, topic: str, outline: dict,
            model: str = config.OLLAMA_MODEL, edit: bool = True,
            k: int = config.TOP_K) -> str:
    sections = outline["sections"]
    thesis = outline["thesis"]
    covered, prev_tail = "", ""
    parts = [f"# {topic}\n"]

    for i, section in enumerate(sections, 1):
        target = section["words"]
        _log(f"[{i}/{len(sections)}] Escribiendo: {section['title']} (~{target} palabras)")
        text = expand_section(profile, topic, thesis, section, covered, prev_tail,
                              model=model, k=k)

        if edit:
            _log("        editando coherencia...")
            text = coherence_pass(text, prev_tail, covered, model=model)

        text = _postprocess_section(text, section["title"])

        # Length control: re-expand sections that fell well short of their budget.
        tries = 0
        while _word_count(text) < SHORT_SECTION_RATIO * target and tries < MAX_EXTEND_TRIES:
            _log(f"        corta ({_word_count(text)}/{target}), extendiendo...")
            text = _postprocess_section(
                _extend_section(text, section, topic, model), section["title"])
            tries += 1

        parts.append(text)
        covered = update_summary(covered, section["title"], text, model=model)
        prev_tail = _tail(text)

    return "\n\n".join(parts).strip() + "\n"
