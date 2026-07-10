from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from common import load_data  # noqa: E402
from normalize_evidence import normalize  # noqa: E402
from render_svg import build_svg  # noqa: E402
from validate_brief import validate  # noqa: E402


class SkillScriptsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.theme = json.loads((ROOT / "assets/themes/cloud-iaas.json").read_text(encoding="utf-8"))

    def test_valid_brief(self) -> None:
        brief = load_data(ROOT / "tests/fixtures/brief.yaml")
        self.assertEqual(validate(brief), [])

    def test_llm_wiki_without_location_is_derived(self) -> None:
        record = normalize({"provider": "llm-wiki", "title": "摘要", "summary": "内容", "confidence": "high"})
        self.assertEqual(record["source_type"], "derived")
        self.assertEqual(record["confidence"], "medium")

    def test_all_visual_types_render_svg(self) -> None:
        specs = [
            {"id": "a", "type": "flow", "title": "流程", "nodes": [{"id": "1", "label": "开始"}, {"id": "2", "label": "结束"}]},
            {"id": "b", "type": "swimlane", "title": "泳道", "lanes": [{"name": "用户", "steps": [{"label": "提交"}, {"label": "确认"}]}]},
            {"id": "c", "type": "matrix", "title": "矩阵", "columns": ["方案 A", "方案 B"], "rows": [{"label": "计费", "values": ["按量", "包年"]}]},
            {"id": "d", "type": "bar", "title": "柱状图", "categories": ["A", "B"], "series": [{"name": "实例", "values": [3, 5]}]},
            {"id": "e", "type": "line", "title": "折线图", "categories": ["1月", "2月"], "series": [{"name": "实例", "values": [3, 5]}]},
            {"id": "f", "type": "funnel", "title": "漏斗", "stages": [{"label": "创建", "value": 100}, {"label": "运行", "value": 80}]},
            {"id": "g", "type": "timeline", "title": "时间线", "events": [{"date": "7月", "title": "灰度"}, {"date": "8月", "title": "发布"}]},
        ]
        for spec in specs:
            with self.subTest(spec["type"]):
                output = build_svg(spec, self.theme)
                self.assertIn("<svg", output)
                self.assertIn(spec["title"], output)

    def test_markdown_publish_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as temp_name:
            temp = Path(temp_name)
            assets = temp / "assets/visuals"
            assets.mkdir(parents=True)
            svg = assets / "flow.svg"
            svg.write_text(build_svg(load_data(ROOT / "tests/fixtures/flow.yaml"), self.theme), encoding="utf-8")
            draft = temp / "draft.md"
            draft.write_text("# PRD\n\n{{visual:instance-lifecycle}}\n", encoding="utf-8")
            manifest = temp / "visuals.yaml"
            manifest.write_text("visuals:\n  - id: instance-lifecycle\n    alt: 实例流程\n    path: assets/visuals/flow.svg\n", encoding="utf-8")
            final = temp / "final.md"
            subprocess.run([sys.executable, str(SCRIPTS / "inject_visuals.py"), str(draft), str(manifest), "--output", str(final)], check=True)
            dist = temp / "dist"
            subprocess.run([sys.executable, str(SCRIPTS / "prepare_publish.py"), str(final), "--output-dir", str(dist)], check=True)
            data = json.loads((dist / "asset-manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(len(data["assets"]), 1)
            bundled_path = data["assets"][0]["bundled_path"]
            mapping = temp / "mapping.json"
            mapping.write_text(json.dumps({bundled_path: "https://example.invalid/flow.png"}), encoding="utf-8")
            feishu = temp / "feishu.md"
            subprocess.run([sys.executable, str(SCRIPTS / "rewrite_asset_links.py"), str(dist / "final.md"), str(mapping), "--output", str(feishu), "--strict"], check=True)
            self.assertIn("https://example.invalid/flow.png", feishu.read_text(encoding="utf-8"))
            subprocess.run([sys.executable, str(SCRIPTS / "lint_prd.py"), str(dist / "final.md")], check=True)


if __name__ == "__main__":
    unittest.main()
