"""CLI: the visible face of the pipeline.

Commands:
    profile create <name>           create a writing profile
    profile list                    list profiles
    ingest  <profile> <files...>    copy files into the profile's corpus
    index   <profile>               build the index (extract + chunk + embed)
    retrieve <profile> "topic"      see which fragments are retrieved (no generation)
    explain  <profile> "topic"      generate an explanation in that style+method
    outline  <profile> "topic"      generate only the plan/structure of a long text
    compose  <profile> "topic"      generate a coherent long text (plan -> expand -> edit)

User-facing strings (help text, messages) are kept in Spanish on purpose: they are
the product's UX for a Spanish-speaking audience.
"""

import argparse
import shutil
import sys
from pathlib import Path

from . import config
from .generation import build_prompt, generate_with_ollama
from .index import build_index
from .ingest import SUPPORTED_EXTS, is_supported
from .longform import (build_outline, compose, outline_to_markdown,
                       parse_outline)
from .profiles import create_profile, list_profiles, load_profile
from .retrieval import retrieve


# --- profile -------------------------------------------------------------
def cmd_profile_create(args):
    prof = create_profile(args.name, description=args.desc or "", metodo=args.metodo or "")
    print(f"Perfil '{prof.name}' creado en {prof.root}")
    print(f"  Poné tus textos en: {prof.documents_dir}")
    print(f"  O usá:  python rag_style.py ingest {prof.name} <archivos...>")


def cmd_profile_list(args):
    profs = list_profiles()
    if not profs:
        print("No hay perfiles todavía. Creá uno:\n  python rag_style.py profile create <nombre>")
        return
    print("Perfiles:")
    for p in profs:
        indexed = "✓ indexado" if p.index_path.exists() else "· sin índice"
        n_docs = len([f for f in p.documents_dir.glob("*") if f.is_file()]) \
            if p.documents_dir.exists() else 0
        print(f"  - {p.name}  [{indexed}]  ({n_docs} archivo/s)  {p.description}")


# --- ingest --------------------------------------------------------------
def cmd_ingest(args):
    prof = load_profile(args.profile)
    prof.documents_dir.mkdir(parents=True, exist_ok=True)
    copied, skipped = 0, 0
    for raw in args.files:
        src = Path(raw).expanduser()
        if not src.is_file():
            print(f"  ! No existe: {src}", file=sys.stderr)
            skipped += 1
            continue
        if not is_supported(src):
            print(f"  ! Formato no soportado ({src.suffix}): {src.name}", file=sys.stderr)
            skipped += 1
            continue
        shutil.copy2(src, prof.documents_dir / src.name)
        copied += 1
        print(f"  + {src.name}")
    print(f"\n{copied} archivo/s copiado/s al perfil '{prof.name}'"
          + (f", {skipped} omitido/s" if skipped else ""))
    print(f"Ahora indexá:  python rag_style.py index {prof.name}")


# --- index ---------------------------------------------------------------
def cmd_index(args):
    prof = load_profile(args.profile)
    n = build_index(prof, ocr_backend_name=args.ocr, ocr_lang=args.lang)
    print(f"Índice guardado en {prof.index_path} ({n} chunks)")
    print(f"Probá:  python rag_style.py retrieve {prof.name} \"tu tema acá\"")


# --- retrieve ------------------------------------------------------------
def cmd_retrieve(args):
    prof = load_profile(args.profile)
    results = retrieve(prof, args.query, random_mode=args.random)
    mode = "AL AZAR" if args.random else "por similitud"
    print(f"\nTop {len(results)} fragmentos ({mode}) en '{prof.name}' para: \"{args.query}\"\n")
    for r in results:
        score = "n/a" if r["score"] != r["score"] else f"{r['score']:.3f}"
        print(f"  #{r['rank']}  [coseno={score}]  ({r['source']})")
        print(f"      {r['text'][:240].replace(chr(10), ' ')}...\n")


# --- explain -------------------------------------------------------------
def cmd_explain(args):
    prof = load_profile(args.profile)
    examples = retrieve(prof, args.query, random_mode=args.random)

    print(f"Ejemplos recuperados del perfil '{prof.name}':")
    for r in examples:
        score = "azar" if r["score"] != r["score"] else f"{r['score']:.3f}"
        print(f"  - ({r['source']}) coseno={score}")
    print()

    prompt = build_prompt(args.query, examples, metodo=prof.metodo)
    if args.show_prompt:
        print("=" * 60, "\nPROMPT ENVIADO AL MODELO:\n", "=" * 60)
        print(prompt)
        print("=" * 60, "\n")

    output = generate_with_ollama(prompt)
    if output is None:
        print(
            "No me pude conectar a Ollama (http://localhost:11434).\n"
            "  1) Instalá Ollama: https://ollama.com\n"
            f"  2) Descargá un modelo:  ollama pull {config.OLLAMA_MODEL}\n"
            "  3) Asegurate de que esté corriendo y reintentá.\n\n"
            "Mientras tanto podés usar 'retrieve' o 'explain ... --show-prompt'."
        )
        sys.exit(1)

    print("-" * 60)
    print(output)
    print("-" * 60)


# --- outline -------------------------------------------------------------
def cmd_outline(args):
    prof = load_profile(args.profile)
    outline = build_outline(prof, args.query, args.words, model=args.model)
    md = outline_to_markdown(outline)
    if args.out:
        Path(args.out).write_text(md, encoding="utf-8")
        print(f"Outline guardado en {args.out}")
        print("Editalo y después:  "
              f"python rag_style.py compose {prof.name} \"{args.query}\" "
              f"--from-outline {args.out}")
    else:
        print(md)


# --- compose -------------------------------------------------------------
def cmd_compose(args):
    prof = load_profile(args.profile)

    if args.from_outline:
        outline = parse_outline(Path(args.from_outline).read_text(encoding="utf-8"))
        if not outline["sections"]:
            raise RuntimeError(f"No pude parsear secciones de '{args.from_outline}'.")
    else:
        print("Generando outline...", file=sys.stderr)
        outline = build_outline(prof, args.query, args.words, model=args.model)
        print("\n" + outline_to_markdown(outline))
        if not args.auto:
            ans = input("\n¿Expandir este outline? [s/N] ").strip().lower()
            if ans not in ("s", "si", "sí", "y", "yes"):
                print("Cancelado. Podés guardar y editar con el comando 'outline'.")
                return

    text = compose(prof, args.query, outline, model=args.model,
                   edit=not args.no_edit)
    words = len(text.split())

    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"\nTexto generado ({words} palabras) guardado en {args.out}",
              file=sys.stderr)
    else:
        print(text)
        print(f"\n[{words} palabras]", file=sys.stderr)


# --- parser --------------------------------------------------------------
def build_parser():
    parser = argparse.ArgumentParser(
        description="RAG de estilo + método didáctico, por perfiles (local).")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_prof = sub.add_parser("profile", help="Gestionar perfiles de escritura")
    prof_sub = p_prof.add_subparsers(dest="prof_cmd", required=True)
    pc = prof_sub.add_parser("create", help="Crear un perfil")
    pc.add_argument("name")
    pc.add_argument("--desc", help="Descripción del perfil")
    pc.add_argument("--metodo", help="Notas explícitas del método didáctico (se inyectan al prompt)")
    prof_sub.add_parser("list", help="Listar perfiles")

    pi = sub.add_parser("ingest", help="Copiar archivos al corpus de un perfil")
    pi.add_argument("profile")
    pi.add_argument("files", nargs="+", help=f"Archivos {sorted(SUPPORTED_EXTS)}")

    px = sub.add_parser("index", help="Construir el índice de un perfil")
    px.add_argument("profile")
    px.add_argument("--ocr", default=config.OCR_BACKEND,
                    choices=["tesseract", "unlimited"], help="Motor de OCR para escaneos/imágenes")
    px.add_argument("--lang", default=config.OCR_LANG, help="Idiomas de tesseract, ej: spa+eng")

    pr = sub.add_parser("retrieve", help="Ver qué fragmentos se recuperan")
    pr.add_argument("profile")
    pr.add_argument("query")
    pr.add_argument("--random", action="store_true", help="Recuperar al azar (para comparar)")

    pe = sub.add_parser("explain", help="Generar una explicación en el estilo+método del perfil")
    pe.add_argument("profile")
    pe.add_argument("query")
    pe.add_argument("--random", action="store_true", help="Usar ejemplos al azar (para comparar)")
    pe.add_argument("--show-prompt", action="store_true", help="Mostrar el prompt completo")

    po = sub.add_parser("outline", help="Generar solo el plan/estructura de un texto largo")
    po.add_argument("profile")
    po.add_argument("query", help="Tema del texto")
    po.add_argument("--words", type=int, default=2000, help="Palabras objetivo (default 2000)")
    po.add_argument("--model", default=config.OLLAMA_MODEL, help="Modelo de Ollama")
    po.add_argument("-o", "--out", help="Guardar el outline en un archivo (editable)")

    pco = sub.add_parser("compose", help="Generar un texto largo coherente (plan -> expand -> edit)")
    pco.add_argument("profile")
    pco.add_argument("query", help="Tema del texto")
    pco.add_argument("--words", type=int, default=2000, help="Palabras objetivo (default 2000)")
    pco.add_argument("--model", default=config.OLLAMA_MODEL, help="Modelo de Ollama")
    pco.add_argument("--auto", action="store_true", help="No pedir confirmación del outline")
    pco.add_argument("--from-outline", help="Usar un outline ya editado (archivo)")
    pco.add_argument("--no-edit", action="store_true", help="Saltear la pasada de coherencia")
    pco.add_argument("-o", "--out", help="Guardar el texto en un archivo")

    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    dispatch = {
        ("profile", "create"): cmd_profile_create,
        ("profile", "list"): cmd_profile_list,
    }
    try:
        if args.cmd == "profile":
            dispatch[("profile", args.prof_cmd)](args)
        elif args.cmd == "ingest":
            cmd_ingest(args)
        elif args.cmd == "index":
            cmd_index(args)
        elif args.cmd == "retrieve":
            cmd_retrieve(args)
        elif args.cmd == "explain":
            cmd_explain(args)
        elif args.cmd == "outline":
            cmd_outline(args)
        elif args.cmd == "compose":
            cmd_compose(args)
    except (FileNotFoundError, FileExistsError, RuntimeError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
