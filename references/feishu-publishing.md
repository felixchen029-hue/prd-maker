# Markdown、SVG 与飞书发布

## 双产物策略

始终保留：

1. Markdown 中的相对 SVG 链接，用于本地、GitHub 和支持 SVG 的渲染器。
2. `asset-manifest.json`，用于飞书 CLI 或其他上传器逐个上传资源。

不要把 SVG 源码直接内嵌进 Markdown。多数 Markdown 解析器会过滤或改变内联 SVG，远端文档平台也常有不同限制。

## 发布流程

1. `render_svg.py` 生成 SVG。
2. `inject_visuals.py` 把图表占位符替换为相对图片链接。
3. `prepare_publish.py` 校验链接、复制资产并生成上传清单。
4. 外部飞书适配器上传清单中的资源。
5. 适配器输出 JSON 路径映射。
6. `rewrite_asset_links.py` 把相对链接替换为飞书可访问的 URL 或适配器约定的 token 表达。
7. 飞书 CLI 上传最终 Markdown。

## 映射格式

```json
{
  "assets/visuals/instance-lifecycle.svg": "https://example.invalid/remote-asset"
}
```

映射值由具体上传器决定。本 Skill 不假定飞书 CLI 的命令名、认证方式或 token 语法。

## PNG 回退

如果飞书接口不接受 SVG：

- 保留 SVG 作为源文件和 Markdown 主产物。
- 在上传阶段把 SVG 转成 PNG。
- 映射文件仍以 Markdown 中的 SVG 相对路径为键，以 PNG 上传结果为值。

转换器应优先使用 CairoSVG 或 `rsvg-convert`。如果环境已有 Node.js 和 Sharp，可通过 `NODE_PATH` 与可选的 `PRD_MAKER_NODE` 交给 `svg_to_png.py` 使用。macOS 可使用 Quick Look 作为本地回退，但不能把它视为跨平台依赖。
