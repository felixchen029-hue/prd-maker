---
name: prd-maker
description: 生成、改写或审阅云计算 IaaS 领域的产品需求文档、个人总结和管理汇报。用于从用户材料、联网调研和可选 llm-wiki 资料源中整理需求背景、市场与竞品分析、实例及功能需求、验收标准和证据，并输出 Markdown 与统一模板渲染的 SVG 图表；也用于准备可交给飞书 CLI 或其他发布适配器的 Markdown 资产包。
---

# PRD Maker

## 工作原则

- 仅处理云计算领域，重点是 IaaS、计算实例及其关联功能。若输入偏离该范围，先说明边界并请用户确认是否仍按云计算视角处理。
- 先确定文档框架，再开展调研和写作。不要在框架未确认时生成完整文档。
- 把用户事实、外部证据和推断分开。事实冲突时保留冲突，不自行选择更顺耳的版本。
- 以 Markdown 为主产物，以 SVG 为图表源文件。禁止为单张图临时编写新的 SVG 代码；只生成图表数据规范并调用本地渲染器。
- 没有可验证来源时标记“待验证”。联网搜索、用户材料和 llm-wiki 都是资料源，不是自动可信来源。

## 1. 识别任务类型

将请求归入以下一种类型：

- `prd`：功能、产品能力或平台能力 PRD。
- `summary`：个人周报、月报、阶段总结或复盘。
- `report`：面向管理层、评审会或跨团队的汇报。

读取对应模板：

- PRD：`assets/templates/cloud-iaas-prd.md`
- 总结：`assets/templates/cloud-iaas-summary.md`
- 汇报：`assets/templates/cloud-iaas-report.md`

涉及实例、镜像、网络、存储、计费、配额、可用区或生命周期时，读取 `references/cloud-iaas-domain.md`。

## 2. 完成前置访谈

先检查用户是否已给出下列信息：

1. 文档类型、标题、目标读者和要支持的决策。
2. 需要的章节、顺序和深度。
3. 产品范围、非目标、地区、时间范围和竞品范围。
4. 已提供材料、是否允许联网搜索、是否启用 llm-wiki。
5. 输出路径、图表要求和引用要求。

缺失时先问最影响框架的 1 至 3 个问题。不要一次抛出完整问卷。根据答案追问启用模块所需的信息。

根据 `references/intake-workflow.md` 生成 `prd-brief.yaml`。调用：

```bash
python3 scripts/validate_brief.py prd-brief.yaml
```

向用户展示文档目录、各模块深度、调研范围和待解决问题。获得确认后再继续。若用户明确要求直接执行，可按合理默认值生成 brief，并在产物中列出假设。

## 3. 规划资料源

读取 `references/source-adapters.md`，按以下优先级处理：

1. 用户提供的内部材料。
2. 官方产品文档、公告、定价页、技术文档和财务披露。
3. 可信第三方研究与媒体。
4. 社区反馈，仅用于口碑、问题线索和待验证假设。
5. llm-wiki 返回的本地或团队知识；保留原始来源元数据。

联网调研必须记录 URL、标题、发布日期或访问日期。llm-wiki 不可用时不得阻塞任务；在证据台账中记录降级原因。

把不同来源转换为 `references/schemas/evidence-record.schema.json` 规定的 JSONL 记录。可调用：

```bash
python3 scripts/normalize_evidence.py raw-evidence.jsonl evidence.jsonl
```

## 4. 分模块分析

先分别形成短分析备忘录，再合并正文。模块可设为 `skip`、`brief`、`standard` 或 `deep`。

- 市场调研：市场边界、客户场景、供需变化、计费与交付模式、证据限制。
- 竞品分析：统一比较对象、版本、地区和计费口径，重点比较实例与功能能力。
- 需求背景：触发事件、用户损失、当前替代方案、证据和约束。
- 需求分析：用户任务、场景、优先级、范围、业务规则和异常路径。
- 方案设计：控制台、API、CLI、IAM、审计、计费、监控、网络、存储和生命周期。
- 验收与发布：可测标准、指标、灰度、回滚、依赖和风险。

使用 `references/research-policy.md` 约束引用、口径和推断。

## 5. 生成统一图表

为每张图创建 YAML 或 JSON 规范，使用 `references/schemas/visual-spec.schema.json`。支持的 V1 类型：

- `flow`
- `swimlane`
- `matrix`
- `bar`
- `line`
- `funnel`
- `timeline`

调用本地渲染器：

```bash
python3 scripts/render_svg.py visual.yaml --output assets/visuals/visual.svg
```

在正文放置占位符：

```text
{{visual:instance-lifecycle}}
```

使用清单注入 Markdown：

```bash
python3 scripts/inject_visuals.py draft.md visual-manifest.yaml --output final.md
```

图表数据必须来自正文已有结论或证据台账。不得为了让图更完整而补造数值。

## 6. 编写并去除 AI 痕迹

读取 `references/writing-style.md`。执行两遍编辑：

1. 内容编辑：检查结论、证据、范围、需求和验收标准是否闭环。
2. 表达编辑：删除聊天口吻、宣传词、模糊归因、机械排比、重复结论和无信息量段落。

不得改写数字、单位、产品名、接口名、业务规则、引用、验收标准或合规措辞。PRD 不使用“注入个性”、随意第一人称、幽默或故意打乱结构等通用人性化技巧。

运行：

```bash
python3 scripts/lint_prd.py final.md
```

## 7. 生成发布资产包

Markdown 可以用相对路径直接引用 SVG：

```markdown
![实例生命周期](assets/visuals/instance-lifecycle.svg)
```

GitHub、本地 Markdown 和支持 SVG 的渲染器可直接使用。飞书或其他平台可能要求先上传资源，或要求 PNG 回退图。运行：

```bash
python3 scripts/prepare_publish.py final.md --output-dir dist
```

该命令复制 Markdown 和图片，生成 `asset-manifest.json`。上传器完成资源上传后，提供路径映射并运行：

```bash
python3 scripts/rewrite_asset_links.py dist/final.md upload-mapping.json --output dist/final.feishu.md
```

飞书接入细节见 `references/feishu-publishing.md`。不要假定某个未确认的飞书 CLI 命令或 SVG 支持能力。

## 8. 交付检查

交付前确认：

- 文档类型、读者和决策目标清楚。
- 所有启用章节均按 brief 生成，跳过项未被擅自补回。
- 市场数据和竞品结论有来源，推断已标记。
- 图表 SVG 存在，Markdown 相对链接有效。
- 飞书发布时已有资产清单；若 SVG 不被支持，已注明 PNG 回退要求。
- PRD 的功能、异常路径、非功能要求和验收标准可测试。
- 总结和汇报仍围绕云计算 IaaS 工作，不扩写成通用职场文章。
