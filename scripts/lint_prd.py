#!/usr/bin/env python3
"""Lint PRD Markdown for broken assets, AI-writing residue, and weak sourcing."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
VISUAL = re.compile(r"\{\{visual:[a-z0-9-]+\}\}")
AI_PHRASES = [
    "至关重要",
    "不断演变的格局",
    "赋能",
    "彰显",
    "标志着一个",
    "这不仅仅是",
    "希望这对您有帮助",
    "当然！",
    "令人叹为观止",
]
VAGUE_ATTRIBUTIONS = ["行业报告显示", "专家认为", "观察者指出", "有观点认为", "用户普遍认为"]
CITATION = re.compile(r"https?://|\[\^[^\]]+\]|来源[:：]|证据[:：]|待验证")
NUMBER_CLAIM = re.compile(r"(?:\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s*(?:亿元|万元|美元|元|台|个|GB|TB|核))", re.I)


def issue(level: str, code: str, line: int, message: str) -> dict[str, object]:
    return {"level": level, "code": code, "line": line, "message": message}


def lint(path: Path) -> list[dict[str, object]]:
    text = path.read_text(encoding="utf-8")
    issues: list[dict[str, object]] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        for phrase in AI_PHRASES:
            if phrase in line:
                issues.append(issue("warning", "ai-phrase", line_no, f"检查 AI 高频表达：{phrase}"))
        for phrase in VAGUE_ATTRIBUTIONS:
            if phrase in line and not CITATION.search(line):
                issues.append(issue("warning", "vague-attribution", line_no, f"模糊归因缺少具体来源：{phrase}"))
        if NUMBER_CLAIM.search(line) and not CITATION.search(line):
            issues.append(issue("warning", "numeric-source", line_no, "数字陈述可能缺少来源或待验证标记"))
        if line.count("**") >= 8:
            issues.append(issue("warning", "bold-density", line_no, "单行粗体标记过多"))
    for match in VISUAL.finditer(text):
        line_no = text.count("\n", 0, match.start()) + 1
        issues.append(issue("error", "unresolved-visual", line_no, f"未解析图表占位符：{match.group(0)}"))
    for match in IMAGE.finditer(text):
        target = match.group(2).strip().split(" ", 1)[0].strip("<>")
        if target.lower().startswith(("http://", "https://", "data:", "feishu://")):
            continue
        asset = (path.parent / target).resolve()
        if not asset.is_file():
            line_no = text.count("\n", 0, match.start()) + 1
            issues.append(issue("error", "missing-asset", line_no, f"图片不存在：{target}"))
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("markdown", type=Path)
    parser.add_argument("--strict", action="store_true", help="Fail on warnings as well as errors")
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()
    issues = lint(args.markdown.resolve())
    if args.as_json:
        print(json.dumps(issues, ensure_ascii=False, indent=2))
    elif not issues:
        print(f"OK: no lint findings in {args.markdown}")
    else:
        for item in issues:
            print(f"{str(item['level']).upper()} {item['code']}:{item['line']} {item['message']}")
    has_error = any(item["level"] == "error" for item in issues)
    if has_error or (args.strict and issues):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
