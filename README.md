# RAG de estilo + método didáctico (por perfiles, 100% local)

Un proyecto para aprender **un** concepto de RAG llevado a la educación: cómo
recuperar ejemplos relevantes y usarlos para condicionar un modelo. Acá los
ejemplos no son "datos para responder" sino **muestras de cómo enseña un autor**:
su estilo *y* su método didáctico. El modelo aprende a explicar **temas nuevos**
con esa misma voz y ese mismo "algoritmo de resolución" pedagógico.

A esto se le llama *few-shot retrieval* o *style-conditioning*.

## El concepto, en una frase

> Replicar **estilo** es copiar la superficie (tono, palabras). Replicar el
> **método didáctico** es copiar el esqueleto: cómo encuadrás el problema, qué
> analogía elegís, en qué orden desarmás la idea, cómo construís el "aha". Este
> proyecto replica las dos cosas.

## Qué cambió respecto de un style-transfer clásico

Un prompt de estilo te dice "copiá el tono, ignorá el contenido". Acá hacemos lo
contrario con la estructura: **sí** copiamos el método de razonamiento del autor
y lo aplicamos a un tema nuevo. El contenido es nuevo; el método es prestado.

## Perfiles

Cada **perfil** es una voz + un método, con su propio corpus e índice:

```
profiles/
└── <perfil>/
    ├── profile.json   # descripción + notas del método (se inyectan al prompt)
    ├── documents/     # archivos fuente de CUALQUIER formato
    └── index.npz      # índice de vectores (se genera con `index`)
```

Tené tantos como quieras: `profe-mate`, `divulgador`, `tutor-de-programación`…
Un perfil = una intención. No mezcles estilos en el mismo índice.

## Ingesta multi-formato

`extract_text()` despacha por extensión y siempre devuelve **texto plano**. El
resto del pipeline no sabe de dónde vino:

| Formato | Cómo se ingiere |
| --- | --- |
| `.txt` `.md` | lectura directa |
| `.pdf` con texto | `pymupdf` |
| `.pdf` escaneado | `pymupdf` renderiza la página → OCR (fallback automático por página) |
| `.png` `.jpg` `.jpeg` `.tiff` `.webp` `.bmp` | OCR |

### OCR pluggable (dos motores)

| Backend | Costo | Cuándo |
| --- | --- | --- |
| `tesseract` (default) | CPU, liviano, gratis | casi siempre. Requiere `brew install tesseract tesseract-lang` |
| `unlimited` | GPU NVIDIA + CUDA 12.9-13 | escaneos largos/complejos y tenés GPU. [Baidu Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) |

El backend se elige con `index --ocr tesseract|unlimited`. La interfaz vive en
`style_rag/ingest/ocr.py`: agregar un motor nuevo es implementar `OCRBackend`,
sin tocar el pipeline.

> **Importante:** el OCR resuelve "imagen → texto". NO reemplaza el *chunking*.
> El chunking parte el texto para que el retrieval encuentre el fragmento
> relevante; es el mecanismo que hace funcionar el RAG, no una limitación.

## El pipeline (cada paso, un concepto)

1. **Ingesta** — cualquier formato → texto plano (`style_rag/ingest/`).
2. **Chunking** — partir en fragmentos de ~120 palabras con solapamiento.
3. **Embeddings** — cada chunk → vector con `sentence-transformers` (local).
4. **Index** — vectores a un `.npz` por perfil (sin base de datos).
5. **Retrieval** — para tu tema, los fragmentos más parecidos por coseno.
6. **Generation** — prompt con esos ejemplos → genera con **Ollama**.

## Puesta en marcha

```bash
# 1. Dependencias base (CPU, gratis)
pip install -r requirements.txt
#    Para OCR con tesseract:  brew install tesseract tesseract-lang

# 2. Crear un perfil
python rag_style.py profile create profe-mate \
  --desc "explica con analogías" \
  --metodo "Arranca con una escena cotidiana. Analogía antes que definición. Cierra fijando el concepto."

# 3. Ingerir archivos (de cualquier formato) al perfil
python rag_style.py ingest profe-mate ./apuntes/*.pdf ./fotos/*.jpg

# 4. Construir el índice
python rag_style.py index profe-mate                 # tesseract por defecto
# python rag_style.py index profe-mate --ocr unlimited   # si tenés GPU

# 5. Ver QUÉ recupera (no necesita Ollama) — el paso más educativo
python rag_style.py retrieve profe-mate "cómo explicar derivadas"

# 6. Generar la explicación en ese estilo + método (necesita Ollama)
python rag_style.py explain profe-mate "cómo explicar derivadas"
```

Para el paso 6 necesitás [Ollama](https://ollama.com) y un modelo:

```bash
ollama pull llama3.1   # o el que tengas, p.ej. llama3.2:3b
```

## Textos largos (plan → expand → edit)

`explain` sirve para una explicación corta. Para un informe de miles de palabras,
generar de un saque NO funciona: el modelo se queda sin tokens, se olvida de lo
que dijo arriba y repite. Por eso los textos largos se **construyen**, no se
generan, en tres etapas (`style_rag/longform.py`):

1. **Plan** — un *outline* con tesis + secciones; a cada sección se le asigna un
   **ángulo único** y un presupuesto de palabras. El ángulo único evita que las
   secciones se pisen → menos repetición.
2. **Expand** — sección por sección. Cada una recibe la tesis global, un
   **resumen rodante** de lo ya escrito ("esto ya se dijo, no lo repitas; conectá
   con esto") y ejemplos de estilo+método recuperados **para esa sección**.
3. **Edit** — una pasada de coherencia por sección que pule transiciones y saca
   repeticiones residuales (se puede saltear con `--no-edit`).

```bash
# Flujo de una fase (automático)
python rag_style.py compose profe-mate "informe sobre la paz mundial" \
  --words 10000 --auto --model llama3.1 -o informe.md

# Flujo de dos fases (revisás el plan antes de gastar 10mil palabras)
python rag_style.py outline profe-mate "informe sobre la paz mundial" \
  --words 10000 -o plan.md
#   ... editás plan.md a gusto ...
python rag_style.py compose profe-mate "informe sobre la paz mundial" \
  --from-outline plan.md -o informe.md

# Sin --auto y sin --from-outline: genera el outline, te lo muestra y confirmás.
```

> **El cuello de botella es el modelo, no el andamiaje.** El pipeline mantiene la
> estructura y el hilo, pero un modelo chico (p. ej. 3B) repite frases y a veces
> filtra palabras de los ejemplos. Para textos largos de calidad usá `--model`
> con un modelo más grande.

## El experimento que enseña el concepto

```bash
python rag_style.py explain profe-mate "qué es una variable"
python rag_style.py explain profe-mate "qué es una variable" --random
```

Con `--random` el modelo recibe ejemplos del perfil **sin relación con el tema**.
El estilo se mantiene, pero el método pierde foco. Esa diferencia *es* el valor
del retrieval.

## Cosas para experimentar

- `CHUNK_WORDS` / `CHUNK_OVERLAP` en `style_rag/config.py`: ¿chunks más chicos
  recuperan mejor?
- `TOP_K`: ¿más ejemplos ayudan o confunden?
- El prompt real: `python rag_style.py explain perfil "..." --show-prompt`.
- Para español, en `profile.json` poné `"embed_model": "paraphrase-multilingual-MiniLM-L12-v2"`.

## Estructura

```
few-shot-retrieval/
├── rag_style.py              # entrypoint (thin) → style_rag.cli
├── requirements.txt
├── style_rag/                # un módulo por concepto del pipeline
│   ├── config.py
│   ├── profiles.py
│   ├── ingest/               # text · pdf · ocr (pluggable) · dispatcher
│   ├── chunking.py
│   ├── embeddings.py
│   ├── index.py
│   ├── retrieval.py
│   ├── generation.py         # prompt de estilo + método didáctico (corto)
│   ├── longform.py           # textos largos: plan → expand → edit
│   └── cli.py
└── profiles/
    └── demo-divulgador/      # perfil de ejemplo, ya con textos
```

## Comandos (referencia rápida)

| Comando | Qué hace |
| --- | --- |
| `profile create <nombre> [--desc ...] [--metodo ...]` | crea un perfil de escritura |
| `profile list` | lista los perfiles y si están indexados |
| `ingest <perfil> <archivos...>` | copia archivos (cualquier formato) al corpus del perfil |
| `index <perfil> [--ocr tesseract\|unlimited] [--lang spa+eng]` | construye el índice (extrae + chunkea + embebe) |
| `retrieve <perfil> "tema" [--random]` | muestra los fragmentos recuperados (sin generar) |
| `explain <perfil> "tema" [--random] [--show-prompt]` | genera una explicación corta en el estilo+método |
| `outline <perfil> "tema" --words N [-o plan.md]` | genera solo el plan/estructura de un texto largo |
| `compose <perfil> "tema" --words N [--auto] [--from-outline f] [--no-edit] [--model M] [-o out.md]` | genera un texto largo coherente |

## Requisitos

- **Python 3.9+**.
- **Base** (CPU, gratis): `sentence-transformers`, `numpy`, `requests`.
- **Ingesta de PDF/imágenes** (opcional): `pymupdf`, y para OCR `pytesseract` + el
  binario `tesseract` (`brew install tesseract tesseract-lang`).
- **Generación**: [Ollama](https://ollama.com) corriendo, con un modelo descargado
  (`ollama pull llama3.1`). Los pasos `index`, `retrieve` y `outline` NO necesitan
  Ollama; `explain` y `compose` sí.

## Licencia

MIT. Si vas a publicarlo, agregá un archivo `LICENSE` con el texto de la licencia
que elijas.

