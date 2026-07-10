#!/usr/bin/env python3
"""Shared helpers for prd-maker scripts."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def load_data(path: str | Path) -> Any:
    source = Path(path)
    text = source.read_text(encoding="utf-8")
    if source.suffix.lower() == ".json":
        return json.loads(text)
    try:
        import yaml  # type: ignore
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "YAML input requires PyYAML. Install it or provide JSON instead."
        ) from exc
    return yaml.safe_load(text)


def write_json(path: str | Path, value: Any) -> None:
    Path(path).write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def slugify(value: str, fallback: str = "item") -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", value)
    value = value.strip("-")
    return value or fallback
