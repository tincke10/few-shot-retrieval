#!/usr/bin/env python3
"""Entrypoint for the style + didactic-method RAG.

All the logic lives in the `style_rag/` package (one module per pipeline concept).
This file only dispatches to the CLI, so `python rag_style.py ...` keeps working
as always.

    python rag_style.py profile create profe-mate --desc "explica con analogías"
    python rag_style.py ingest profe-mate ./apuntes/*.pdf ./fotos/*.jpg
    python rag_style.py index profe-mate
    python rag_style.py retrieve profe-mate "cómo explicar derivadas"
    python rag_style.py explain  profe-mate "cómo explicar derivadas"
    python rag_style.py compose  profe-mate "informe sobre la paz" --words 10000
"""

from style_rag.cli import main

if __name__ == "__main__":
    main()
