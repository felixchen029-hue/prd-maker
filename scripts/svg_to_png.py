#!/usr/bin/env python3
"""Create a PNG fallback for publishers that do not accept SVG images."""

from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import tempfile
from pathlib import Path


def convert(source: Path, output: Path, width: int) -> str:
    if importlib.util.find_spec("cairosvg"):
        import cairosvg  # type: ignore

        cairosvg.svg2png(url=str(source), write_to=str(output), output_width=width)
        return "cairosvg"
    rsvg = shutil.which("rsvg-convert")
    if rsvg:
        subprocess.run([rsvg, "-w", str(width), "-o", str(output), str(source)], check=True)
        return "rsvg-convert"
    magick = shutil.which("magick")
    if magick:
        subprocess.run([magick, str(source), "-resize", str(width), str(output)], check=True)
        return "magick"
    node = os.environ.get("PRD_MAKER_NODE") or shutil.which("node")
    if node and os.environ.get("NODE_PATH"):
        script = (
            "const sharp=require('sharp');"
            "sharp(process.argv[1]).resize({width:Number(process.argv[3])}).png()"
            ".toFile(process.argv[2]).catch(e=>{console.error(e.message);process.exit(1)})"
        )
        try:
            subprocess.run([node, "-e", script, str(source), str(output), str(width)], check=True)
            return "sharp"
        except subprocess.CalledProcessError:
            pass
    qlmanage = shutil.which("qlmanage")
    if qlmanage:
        with tempfile.TemporaryDirectory() as temp_dir:
            subprocess.run(
                [qlmanage, "-t", "-s", str(width), "-o", temp_dir, str(source)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            candidates = list(Path(temp_dir).glob("*.png"))
            if not candidates:
                raise RuntimeError("Quick Look did not create a PNG")
            shutil.move(str(candidates[0]), output)
        return "qlmanage"
    raise RuntimeError("No SVG rasterizer found. Install CairoSVG or librsvg.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svg", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--width", type=int, default=1600)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    engine = convert(args.svg.resolve(), args.output.resolve(), args.width)
    print(f"OK: rendered {args.output} with {engine}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
