#!/usr/bin/env python3
"""Rewrite local Markdown image links using an uploader-provided JSON mapping."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def is_remote(value: str) -> bool:
    return value.lower().startswith(("http://", "https://", "data:", "feishu://"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("mapping", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    mapping = json.loads(args.mapping.read_text(encoding="utf-8"))
    if isinstance(mapping, dict) and isinstance(mapping.get("assets"), list):
        mapping = {
            str(item["bundled_path"]): str(item.get("remote_url") or item.get("token") or "")
            for item in mapping["assets"]
            if isinstance(item, dict) and item.get("bundled_path")
        }
    if not isinstance(mapping, dict):
        raise SystemExit("mapping must be an object")

    missing: set[str] = set()

    def replace(match: re.Match[str]) -> str:
        alt, target = match.group(1), match.group(2).strip()
        clean = target.split(" ", 1)[0].strip("<>")
        if is_remote(clean):
            return match.group(0)
        remote = mapping.get(clean)
        if not remote:
            missing.add(clean)
            return match.group(0)
        return f"![{alt}]({remote})"

    output = IMAGE.sub(replace, args.markdown.read_text(encoding="utf-8"))
    if args.strict and missing:
        raise SystemExit("missing asset mappings: " + ", ".join(sorted(missing)))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    suffix = f"; unresolved: {', '.join(sorted(missing))}" if missing else ""
    print(f"OK: wrote {args.output}{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
