"""Writing PROFILE management.

A profile = one voice + one didactic method. Each with its own corpus and index:

    profiles/<name>/
        profile.json   -> metadata (description, method notes, model)
        documents/      -> source files in ANY format
        index.npz       -> vector index (built with `index`)

Splitting by profile avoids the classic mistake of mixing styles in a single
index: if you throw Cortázar and a tax manual into the same bag, retrieval gives
you a Frankenstein. One profile = one intent.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from . import config


@dataclass
class Profile:
    name: str
    description: str = ""
    metodo: str = ""              # explicit didactic-method notes (optional)
    embed_model: str = config.DEFAULT_EMBED_MODEL

    @property
    def root(self) -> Path:
        return config.PROFILES_DIR / self.name

    @property
    def documents_dir(self) -> Path:
        return self.root / "documents"

    @property
    def index_path(self) -> Path:
        return self.root / "index.npz"

    @property
    def config_path(self) -> Path:
        return self.root / "profile.json"

    def save(self) -> None:
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        data = {
            "name": self.name,
            "description": self.description,
            "metodo": self.metodo,
            "embed_model": self.embed_model,
        }
        self.config_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )


def _slug(name: str) -> str:
    return name.strip().lower().replace(" ", "-")


def create_profile(name: str, description: str = "", metodo: str = "",
                   embed_model: str = config.DEFAULT_EMBED_MODEL) -> Profile:
    name = _slug(name)
    prof = Profile(name=name, description=description, metodo=metodo,
                   embed_model=embed_model)
    if prof.config_path.exists():
        raise FileExistsError(f"El perfil '{name}' ya existe en {prof.root}")
    prof.save()
    return prof


def load_profile(name: str) -> Profile:
    name = _slug(name)
    root = config.PROFILES_DIR / name
    cfg = root / "profile.json"
    if not cfg.exists():
        raise FileNotFoundError(
            f"No existe el perfil '{name}'. Crealo con:\n"
            f"  python rag_style.py profile create {name}"
        )
    data = json.loads(cfg.read_text(encoding="utf-8"))
    return Profile(
        name=data.get("name", name),
        description=data.get("description", ""),
        metodo=data.get("metodo", ""),
        embed_model=data.get("embed_model", config.DEFAULT_EMBED_MODEL),
    )


def list_profiles() -> list[Profile]:
    if not config.PROFILES_DIR.exists():
        return []
    out = []
    for child in sorted(config.PROFILES_DIR.iterdir()):
        if (child / "profile.json").exists():
            try:
                out.append(load_profile(child.name))
            except Exception:
                continue
    return out
