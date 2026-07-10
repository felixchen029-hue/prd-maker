#!/usr/bin/env python3
"""Replace {{visual:id}} placeholders with Markdown SVG image links."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from common import load_data


PLACEHOLDER = re.compile(r"\{\{visual:([a-z0-9-]+)\}\}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    value = load_data(args.manifest)
    entries = value.get("visuals", value) if isinstance(value, dict) else value
    if not isinstance(entries, list):
        raise SystemExit("manifest must be a list or contain a visuals list")
    mapping = {
        str(item["id"]): (str(item.get("alt") or item["id"]), str(item["path"]))
        for item in entries
        if isinstance(item, dict) and item.get("id") and item.get("path")
    }

    used: set[str] = set()

    def replace(match: re.Match[str]) -> str:
        visual_id = match.group(1)
        if visual_id not in mapping:
            return match.group(0)
        used.add(visual_id)
        alt, path = mapping[visual_id]
        return f"![{alt}]({path})"

    output = PLACEHOLDER.sub(replace, args.markdown.read_text(encoding="utf-8"))
    unresolved = sorted(set(PLACEHOLDER.findall(output)))
    if unresolved:
        raise SystemExit("unresolved visual placeholders: " + ", ".join(unresolved))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    unused = sorted(set(mapping) - used)
    suffix = f"; unused: {', '.join(unused)}" if unused else ""
    print(f"OK: wrote {args.output}{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
