#!/usr/bin/env python3
"""Render deterministic, theme-controlled SVG diagrams from YAML or JSON specs."""

from __future__ import annotations

import argparse
import json
import math
from html import escape
from pathlib import Path
from typing import Any

from common import load_data


SUPPORTED = {"flow", "swimlane", "matrix", "bar", "line", "funnel", "timeline"}


def units(char: str) -> float:
    return 0.55 if ord(char) < 128 else 1.0


def wrap(text: Any, limit: float) -> list[str]:
    value = str(text or "").strip()
    if not value:
        return [""]
    lines: list[str] = []
    current = ""
    width = 0.0
    for char in value:
        weight = units(char)
        if current and width + weight > limit:
            lines.append(current)
            current = char
            width = weight
        else:
            current += char
            width += weight
    if current:
        lines.append(current)
    return lines


def text_block(
    x: float,
    y: float,
    value: Any,
    *,
    limit: float,
    size: int,
    color: str,
    anchor: str = "start",
    weight: int = 400,
    line_height: int | None = None,
) -> str:
    line_height = line_height or int(size * 1.35)
    lines = wrap(value, limit)
    tspans = []
    for index, line in enumerate(lines):
        dy = 0 if index == 0 else line_height
        tspans.append(f'<tspan x="{x:.1f}" dy="{dy}">{escape(line)}</tspan>')
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" '
        f'font-size="{size}" font-weight="{weight}" fill="{color}">'
        + "".join(tspans)
        + "</text>"
    )


def n(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def render_flow(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    nodes = spec.get("nodes") or []
    if not nodes:
        raise ValueError("flow requires nodes")
    node_w, node_h, gap = min(320, width - 120), 68, 52
    x = (width - node_w) / 2
    top = 105
    positions: dict[str, tuple[float, float]] = {}
    for index, node in enumerate(nodes):
        positions[str(node.get("id", index))] = (x, top + index * (node_h + gap))

    edges = spec.get("edges") or [
        {"from": str(nodes[i].get("id", i)), "to": str(nodes[i + 1].get("id", i + 1))}
        for i in range(len(nodes) - 1)
    ]
    parts: list[str] = []
    for edge in edges:
        source = positions.get(str(edge.get("from")))
        target = positions.get(str(edge.get("to")))
        if not source or not target:
            continue
        x1, y1 = source[0] + node_w / 2, source[1] + node_h
        x2, y2 = target[0] + node_w / 2, target[1]
        mid = (y1 + y2) / 2
        path = f"M{x1:.1f},{y1:.1f} C{x1:.1f},{mid:.1f} {x2:.1f},{mid:.1f} {x2:.1f},{y2:.1f}"
        parts.append(f'<path d="{path}" class="edge" marker-end="url(#arrow)"/>')
        if edge.get("condition"):
            parts.append(
                text_block(x1 + 16, mid - 4, edge["condition"], limit=18, size=12, color=theme["muted"])
            )
    for index, node in enumerate(nodes):
        node_id = str(node.get("id", index))
        nx, ny = positions[node_id]
        tone = node.get("tone", "default")
        fill = theme.get(tone, theme["surface"]) if tone != "default" else theme["surface"]
        parts.append(
            f'<rect x="{nx:.1f}" y="{ny:.1f}" width="{node_w}" height="{node_h}" rx="12" '
            f'fill="{fill}" stroke="{theme["border"]}" stroke-width="1.5"/>'
        )
        parts.append(
            text_block(
                nx + node_w / 2,
                ny + 30,
                node.get("label", node_id),
                limit=node_w / 15,
                size=15,
                color=theme["text"],
                anchor="middle",
                weight=600,
            )
        )
    height = top + len(nodes) * node_h + max(0, len(nodes) - 1) * gap + 62
    return "".join(parts), height


def render_swimlane(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    lanes = spec.get("lanes") or []
    if not lanes:
        raise ValueError("swimlane requires lanes")
    max_steps = max((len(lane.get("steps") or []) for lane in lanes), default=1)
    left, top, label_w, lane_h = 40, 105, 150, 112
    cell_w = max(140, (width - left * 2 - label_w) / max_steps)
    actual_width = left * 2 + label_w + cell_w * max_steps
    if actual_width > width:
        width = int(actual_width)
    parts: list[str] = []
    for lane_index, lane in enumerate(lanes):
        y = top + lane_index * lane_h
        parts.append(
            f'<rect x="{left}" y="{y}" width="{width-left*2}" height="{lane_h-8}" rx="10" '
            f'fill="{theme["surface"]}" stroke="{theme["grid"]}"/>'
        )
        parts.append(
            text_block(left + 16, y + 34, lane.get("name", f"泳道 {lane_index + 1}"), limit=12, size=14, color=theme["text"], weight=600)
        )
        steps = lane.get("steps") or []
        for step_index, step in enumerate(steps):
            x = left + label_w + step_index * cell_w + 10
            box_w = cell_w - 20
            parts.append(
                f'<rect x="{x:.1f}" y="{y+20}" width="{box_w:.1f}" height="60" rx="10" '
                f'fill="{theme["accent_soft"]}" stroke="{theme["accent"]}"/>'
            )
            label = step.get("label", step) if isinstance(step, dict) else step
            parts.append(
                text_block(x + box_w / 2, y + 48, label, limit=box_w / 14, size=13, color=theme["text"], anchor="middle", weight=600)
            )
            if step_index < len(steps) - 1:
                x1 = x + box_w
                x2 = x + cell_w + 10
                parts.append(
                    f'<path d="M{x1:.1f},{y+50} L{x2-5:.1f},{y+50}" class="edge" marker-end="url(#arrow)"/>'
                )
    return "".join(parts), top + len(lanes) * lane_h + 52


def render_matrix(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    columns = [str(x) for x in (spec.get("columns") or [])]
    rows = spec.get("rows") or []
    if not columns or not rows:
        raise ValueError("matrix requires columns and rows")
    left, top, row_name_w, row_h = 40, 105, 170, 70
    col_w = (width - left * 2 - row_name_w) / len(columns)
    parts: list[str] = []
    parts.append(f'<rect x="{left}" y="{top}" width="{row_name_w}" height="{row_h}" fill="{theme["accent"]}" rx="8"/>')
    parts.append(text_block(left + 16, top + 40, "比较维度", limit=12, size=14, color="#ffffff", weight=700))
    for col_index, column in enumerate(columns):
        x = left + row_name_w + col_index * col_w
        parts.append(f'<rect x="{x:.1f}" y="{top}" width="{col_w:.1f}" height="{row_h}" fill="{theme["accent"]}"/>')
        parts.append(text_block(x + col_w / 2, top + 40, column, limit=col_w / 14, size=14, color="#ffffff", anchor="middle", weight=700))
    for row_index, row in enumerate(rows):
        y = top + (row_index + 1) * row_h
        fill = theme["surface"] if row_index % 2 == 0 else theme["surface_alt"]
        parts.append(f'<rect x="{left}" y="{y}" width="{row_name_w}" height="{row_h}" fill="{fill}" stroke="{theme["grid"]}"/>')
        parts.append(text_block(left + 14, y + 35, row.get("label", ""), limit=15, size=13, color=theme["text"], weight=600))
        values = row.get("values") or []
        for col_index in range(len(columns)):
            x = left + row_name_w + col_index * col_w
            value = values[col_index] if col_index < len(values) else ""
            parts.append(f'<rect x="{x:.1f}" y="{y}" width="{col_w:.1f}" height="{row_h}" fill="{fill}" stroke="{theme["grid"]}"/>')
            parts.append(text_block(x + col_w / 2, y + 31, value, limit=col_w / 13, size=12, color=theme["text"], anchor="middle"))
    return "".join(parts), top + (len(rows) + 1) * row_h + 52


def chart_frame(theme: dict[str, Any], left: float, top: float, right: float, bottom: float) -> str:
    return (
        f'<line x1="{left}" y1="{top}" x2="{left}" y2="{bottom}" stroke="{theme["grid"]}"/>'
        f'<line x1="{left}" y1="{bottom}" x2="{right}" y2="{bottom}" stroke="{theme["grid"]}"/>'
    )


def render_bar(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    categories = [str(x) for x in (spec.get("categories") or [])]
    series = spec.get("series") or []
    if not categories or not series:
        raise ValueError("bar requires categories and series")
    left, right, top, bottom = 90, width - 50, 120, 450
    all_values = [n(value) for item in series for value in (item.get("values") or [])]
    maximum = max(all_values + [1.0])
    group_w = (right - left) / len(categories)
    bar_w = min(38, group_w * 0.72 / len(series))
    parts = [chart_frame(theme, left, top, right, bottom)]
    for tick in range(5):
        value = maximum * tick / 4
        y = bottom - (bottom - top) * tick / 4
        parts.append(f'<line x1="{left}" y1="{y:.1f}" x2="{right}" y2="{y:.1f}" stroke="{theme["grid"]}" stroke-dasharray="4 6"/>')
        parts.append(text_block(left - 12, y + 4, f"{value:g}", limit=8, size=11, color=theme["muted"], anchor="end"))
    colors = theme["series"]
    for s_index, item in enumerate(series):
        values = item.get("values") or []
        color = item.get("color") or colors[s_index % len(colors)]
        for c_index, _category in enumerate(categories):
            value = n(values[c_index]) if c_index < len(values) else 0
            height = (bottom - top) * value / maximum
            x = left + c_index * group_w + group_w / 2 - len(series) * bar_w / 2 + s_index * bar_w
            y = bottom - height
            parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w-3:.1f}" height="{height:.1f}" rx="4" fill="{color}"/>')
    for c_index, category in enumerate(categories):
        x = left + c_index * group_w + group_w / 2
        parts.append(text_block(x, bottom + 26, category, limit=group_w / 13, size=11, color=theme["muted"], anchor="middle"))
    legend_x = left
    for s_index, item in enumerate(series):
        color = item.get("color") or colors[s_index % len(colors)]
        parts.append(f'<rect x="{legend_x}" y="80" width="12" height="12" rx="3" fill="{color}"/>')
        parts.append(text_block(legend_x + 18, 91, item.get("name", f"系列 {s_index+1}"), limit=16, size=12, color=theme["muted"]))
        legend_x += 140
    return "".join(parts), 520


def render_line(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    categories = [str(x) for x in (spec.get("categories") or [])]
    series = spec.get("series") or []
    if len(categories) < 2 or not series:
        raise ValueError("line requires at least two categories and one series")
    left, right, top, bottom = 90, width - 50, 120, 450
    all_values = [n(value) for item in series for value in (item.get("values") or [])]
    maximum = max(all_values + [1.0])
    parts = [chart_frame(theme, left, top, right, bottom)]
    colors = theme["series"]
    for tick in range(5):
        value = maximum * tick / 4
        y = bottom - (bottom - top) * tick / 4
        parts.append(f'<line x1="{left}" y1="{y:.1f}" x2="{right}" y2="{y:.1f}" stroke="{theme["grid"]}" stroke-dasharray="4 6"/>')
        parts.append(text_block(left - 12, y + 4, f"{value:g}", limit=8, size=11, color=theme["muted"], anchor="end"))
    for s_index, item in enumerate(series):
        values = item.get("values") or []
        color = item.get("color") or colors[s_index % len(colors)]
        points: list[tuple[float, float]] = []
        for index in range(len(categories)):
            value = n(values[index]) if index < len(values) else 0
            x = left + (right - left) * index / (len(categories) - 1)
            y = bottom - (bottom - top) * value / maximum
            points.append((x, y))
        points_attr = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
        parts.append(f'<polyline points="{points_attr}" fill="none" stroke="{color}" stroke-width="3" stroke-linejoin="round"/>')
        for x, y in points:
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{theme["background"]}" stroke="{color}" stroke-width="3"/>')
    for index, category in enumerate(categories):
        x = left + (right - left) * index / (len(categories) - 1)
        parts.append(text_block(x, bottom + 26, category, limit=12, size=11, color=theme["muted"], anchor="middle"))
    legend_x = left
    for s_index, item in enumerate(series):
        color = item.get("color") or colors[s_index % len(colors)]
        parts.append(f'<line x1="{legend_x}" y1="86" x2="{legend_x+18}" y2="86" stroke="{color}" stroke-width="3"/>')
        parts.append(text_block(legend_x + 25, 91, item.get("name", f"系列 {s_index+1}"), limit=16, size=12, color=theme["muted"]))
        legend_x += 140
    return "".join(parts), 520


def render_funnel(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    stages = spec.get("stages") or []
    if not stages:
        raise ValueError("funnel requires stages")
    values = [max(0.0, n(stage.get("value"))) for stage in stages]
    maximum = max(values + [1.0])
    center, top, stage_h, max_w = width / 2, 110, 74, width - 160
    parts: list[str] = []
    colors = theme["series"]
    for index, stage in enumerate(stages):
        current_w = max(160, max_w * values[index] / maximum)
        next_value = values[index + 1] if index + 1 < len(values) else values[index] * 0.82
        next_w = max(140, max_w * next_value / maximum)
        y = top + index * stage_h
        points = [
            (center - current_w / 2, y),
            (center + current_w / 2, y),
            (center + next_w / 2, y + stage_h - 8),
            (center - next_w / 2, y + stage_h - 8),
        ]
        point_text = " ".join(f"{x:.1f},{py:.1f}" for x, py in points)
        color = colors[index % len(colors)]
        parts.append(f'<polygon points="{point_text}" fill="{color}" opacity="0.9"/>')
        label = f'{stage.get("label", "阶段")}  {values[index]:g}'
        parts.append(text_block(center, y + 36, label, limit=current_w / 14, size=14, color="#ffffff", anchor="middle", weight=700))
    return "".join(parts), top + len(stages) * stage_h + 52


def render_timeline(spec: dict[str, Any], theme: dict[str, Any], width: int) -> tuple[str, int]:
    events = spec.get("events") or []
    if not events:
        raise ValueError("timeline requires events")
    left, top, row_h = 110, 110, 104
    line_x = left + 90
    parts = [f'<line x1="{line_x}" y1="{top}" x2="{line_x}" y2="{top + (len(events)-1)*row_h}" stroke="{theme["accent"]}" stroke-width="3"/>']
    for index, event in enumerate(events):
        y = top + index * row_h
        parts.append(f'<circle cx="{line_x}" cy="{y}" r="8" fill="{theme["background"]}" stroke="{theme["accent"]}" stroke-width="4"/>')
        parts.append(text_block(line_x - 24, y + 5, event.get("date", ""), limit=14, size=12, color=theme["muted"], anchor="end", weight=600))
        parts.append(text_block(line_x + 28, y - 4, event.get("title", ""), limit=(width-line_x-70)/15, size=15, color=theme["text"], weight=700))
        if event.get("description"):
            parts.append(text_block(line_x + 28, y + 21, event["description"], limit=(width-line_x-70)/12, size=12, color=theme["muted"]))
    return "".join(parts), top + len(events) * row_h + 35


RENDERERS = {
    "flow": render_flow,
    "swimlane": render_swimlane,
    "matrix": render_matrix,
    "bar": render_bar,
    "line": render_line,
    "funnel": render_funnel,
    "timeline": render_timeline,
}


def build_svg(spec: dict[str, Any], theme: dict[str, Any]) -> str:
    visual_type = str(spec.get("type", ""))
    if visual_type not in SUPPORTED:
        raise ValueError(f"unsupported visual type: {visual_type}")
    width = int(spec.get("width") or 960)
    width = max(640, min(width, 1600))
    body, height = RENDERERS[visual_type](spec, theme, width)
    source_note = str(spec.get("source_note") or "").strip()
    if source_note:
        body += text_block(40, height - 18, "来源：" + source_note, limit=(width - 80) / 12, size=11, color=theme["muted"])
    subtitle = str(spec.get("subtitle") or "").strip()
    header = text_block(40, 46, spec.get("title", ""), limit=(width - 80) / 22, size=24, color=theme["text"], weight=700)
    if subtitle:
        header += text_block(40, 72, subtitle, limit=(width - 80) / 13, size=13, color=theme["muted"])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
  <title id="title">{escape(str(spec.get("title", "图表")))}</title>
  <desc id="desc">{escape(str(spec.get("subtitle", visual_type)))}</desc>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="{theme["accent"]}"/>
    </marker>
    <style>
      text {{ font-family: {theme["font_family"]}; }}
      .edge {{ fill: none; stroke: {theme["accent"]}; stroke-width: 2; }}
    </style>
  </defs>
  <rect width="100%" height="100%" fill="{theme["background"]}" rx="16"/>
  {header}
  {body}
</svg>
'''


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--theme", type=Path)
    args = parser.parse_args()
    default_theme = Path(__file__).resolve().parents[1] / "assets" / "themes" / "cloud-iaas.json"
    theme_path = args.theme or default_theme
    spec = load_data(args.spec)
    if not isinstance(spec, dict):
        raise SystemExit("visual spec must be an object")
    theme = json.loads(theme_path.read_text(encoding="utf-8"))
    output = build_svg(spec, theme)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    print(f"OK: rendered {spec.get('type')} visual to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
