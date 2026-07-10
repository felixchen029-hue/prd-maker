#!/usr/bin/env python3
"""Validate a PRD Maker brief without requiring jsonschema."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from common import load_data


DOCUMENT_TYPES = {"prd", "summary", "report"}
DEPTHS = {"skip", "brief", "standard", "deep"}
PRESETS = {
    "feature-prd",
    "strategy-prd",
    "growth-experiment",
    "platform-capability",
    "internal-tool",
    "summary",
    "report",
    "custom",
}


def require_mapping(value: Any, path: str, errors: list[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        errors.append(f"{path} must be an object")
        return {}
    return value


def validate(data: Any) -> list[str]:
    errors: list[str] = []
    root = require_mapping(data, "$", errors)

    document = require_mapping(root.get("document"), "document", errors)
    if document.get("type") not in DOCUMENT_TYPES:
        errors.append("document.type must be prd, summary, or report")
    if not str(document.get("title", "")).strip():
        errors.append("document.title is required")
    audience = document.get("audience")
    if not isinstance(audience, list) or not any(str(x).strip() for x in audience):
        errors.append("document.audience must contain at least one reader")
    if not str(document.get("decision", "")).strip():
        errors.append("document.decision is required")

    scope = require_mapping(root.get("scope"), "scope", errors)
    if scope.get("industry") != "cloud-computing":
        errors.append("scope.industry must be cloud-computing")
    if not str(scope.get("focus", "")).strip():
        errors.append("scope.focus is required")

    framework = require_mapping(root.get("framework"), "framework", errors)
    preset = framework.get("preset", "custom")
    if preset not in PRESETS:
        errors.append(f"framework.preset has unsupported value: {preset}")
    sections = require_mapping(framework.get("sections"), "framework.sections", errors)
    if not sections:
        errors.append("framework.sections must not be empty")
    for name, depth in sections.items():
        if depth not in DEPTHS:
            errors.append(f"framework.sections.{name} must be one of {sorted(DEPTHS)}")

    sources = require_mapping(root.get("sources"), "sources", errors)
    if not isinstance(sources.get("web"), bool):
        errors.append("sources.web must be true or false")
    if sources.get("llm_wiki") not in {"off", "auto", "required"}:
        errors.append("sources.llm_wiki must be off, auto, or required")
    if not isinstance(sources.get("citations_required"), bool):
        errors.append("sources.citations_required must be true or false")

    output = require_mapping(root.get("output"), "output", errors)
    if output.get("format") != "markdown":
        errors.append("output.format must be markdown in V1")
    if output.get("language") not in {"zh-CN", "en-US"}:
        errors.append("output.language must be zh-CN or en-US")

    visuals = root.get("visuals", {})
    if visuals is not None and not isinstance(visuals, dict):
        errors.append("visuals must be an object")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("brief", type=Path)
    args = parser.parse_args()
    try:
        data = load_data(args.brief)
    except Exception as exc:
        print(f"ERROR: cannot read brief: {exc}", file=sys.stderr)
        return 2
    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"OK: {args.brief} is a valid prd-maker brief")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
