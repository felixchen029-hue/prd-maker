#!/usr/bin/env python3
"""Normalize JSONL research records into the prd-maker evidence contract."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Any, Iterable


PROVIDERS = {"user-files", "web", "llm-wiki", "manual"}
SOURCE_TYPES = {"primary", "secondary", "community", "internal", "derived"}
CONFIDENCE = {"low", "medium", "high"}


def read_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        value = json.loads(line)
        if not isinstance(value, dict):
            raise ValueError(f"line {number} must be a JSON object")
        yield value


def first(record: dict[str, Any], *keys: str, default: str = "") -> str:
    for key in keys:
        value = record.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return default


def normalize(record: dict[str, Any]) -> dict[str, Any]:
    provider = first(record, "provider", default="manual")
    if provider not in PROVIDERS:
        provider = "manual"
    location = first(record, "location", "url", "path", "source_url")
    title = first(record, "title", "name", default="未命名来源")
    claim = first(record, "claim", "summary", "text", "content")
    source_type = first(record, "source_type", default="secondary")
    if source_type not in SOURCE_TYPES:
        source_type = "secondary"
    confidence = first(record, "confidence", default="medium")
    if confidence not in CONFIDENCE:
        confidence = "medium"

    if provider == "user-files" and source_type == "secondary":
        source_type = "internal"
    if provider == "llm-wiki" and not location:
        source_type = "derived"
        if confidence == "high":
            confidence = "medium"

    digest_input = "\n".join([provider, location, title, claim]).encode("utf-8")
    evidence_id = first(record, "id") or "ev-" + hashlib.sha256(digest_input).hexdigest()[:12]
    metadata = record.get("metadata") if isinstance(record.get("metadata"), dict) else {}

    return {
        "id": evidence_id,
        "provider": provider,
        "source_type": source_type,
        "title": title,
        "claim": claim,
        "excerpt": first(record, "excerpt", "snippet"),
        "location": location,
        "published_at": record.get("published_at") or record.get("date"),
        "retrieved_at": first(record, "retrieved_at", default=date.today().isoformat()),
        "confidence": confidence,
        "tags": record.get("tags") if isinstance(record.get("tags"), list) else [],
        "metadata": metadata,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    seen: set[tuple[str, str, str]] = set()
    normalized: list[dict[str, Any]] = []
    for record in read_jsonl(args.input):
        item = normalize(record)
        key = (item["location"], item["title"], item["claim"])
        if key in seen:
            continue
        seen.add(key)
        normalized.append(item)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for item in normalized:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"OK: wrote {len(normalized)} evidence records to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
