#!/usr/bin/env python3
"""Bundle Markdown image assets and emit a publisher-neutral upload manifest."""

from __future__ import annotations

import argparse
import hashlib
import mimetypes
import re
import shutil
from pathlib import Path
from urllib.parse import unquote

from common import slugify, write_json


IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def is_remote(target: str) -> bool:
    lowered = target.lower()
    return lowered.startswith(("http://", "https://", "data:", "feishu://"))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    source_md = args.markdown.resolve()
    text = source_md.read_text(encoding="utf-8")
    output_dir = args.output_dir.resolve()
    asset_dir = output_dir / "assets"
    asset_dir.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, object]] = []
    copied: dict[Path, str] = {}

    def replace(match: re.Match[str]) -> str:
        alt, raw_target = match.group(1), match.group(2).strip()
        target = raw_target.split(" ", 1)[0].strip("<>")
        if is_remote(target):
            return match.group(0)
        source_asset = (source_md.parent / unquote(target)).resolve()
        if not source_asset.is_file():
            raise FileNotFoundError(f"missing Markdown asset: {target}")
        if source_asset not in copied:
            file_hash = digest(source_asset)
            safe_stem = slugify(source_asset.stem, "asset")
            bundled_name = f"{safe_stem}-{file_hash[:8]}{source_asset.suffix.lower()}"
            destination = asset_dir / bundled_name
            shutil.copy2(source_asset, destination)
            bundled_target = f"assets/{bundled_name}"
            copied[source_asset] = bundled_target
            media_type = mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
            records.append(
                {
                    "id": f"asset-{len(records)+1:03d}",
                    "alt": alt,
                    "source": str(source_asset),
                    "markdown_path": target,
                    "bundled_path": bundled_target,
                    "media_type": media_type,
                    "sha256": file_hash,
                    "needs_raster_fallback": source_asset.suffix.lower() == ".svg",
                }
            )
        return f"![{alt}]({copied[source_asset]})"

    bundled_text = IMAGE.sub(replace, text)
    output_markdown = output_dir / source_md.name
    output_markdown.write_text(bundled_text, encoding="utf-8")
    write_json(
        output_dir / "asset-manifest.json",
        {
            "markdown": output_markdown.name,
            "assets": records,
            "publisher_contract": "Upload each bundled_path and return a mapping from bundled_path to remote URL or token.",
        },
    )
    print(f"OK: bundled {len(records)} assets in {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
