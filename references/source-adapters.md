# 资料源适配器

## 统一输出契约

所有资料源都转换为 JSONL。每行是一条证据记录，字段见 `schemas/evidence-record.schema.json`。

最少保留：

- `id`
- `provider`
- `source_type`
- `title`
- `claim`
- `retrieved_at`
- `location`，可以是 URL 或本地路径

## 内置资料源

### user-files

用户直接提供的 Markdown、PDF、文档、表格、会议纪要和代码。内部信息不自动视为公开事实，按用户给出的保密范围处理。

### web

使用当前环境提供的联网搜索工具。优先官方文档、定价页、公告、财报和标准组织材料。

### llm-wiki

llm-wiki 是可选适配器，不是硬依赖。具体 MCP、CLI 或本地 API 尚未确定，因此 V1 只冻结输入输出契约。

适配器应接收：

```json
{
  "query": "云服务器实例启动失败的常见用户场景",
  "namespace": "cloud-computing",
  "filters": {"product": "iaas-compute"},
  "limit": 20
}
```

适配器应返回可以转换为证据记录的数组，并尽量包含原始文档标题、路径或 URL、更新时间、片段和上游来源。

如果 llm-wiki 只返回模型总结而没有上游来源：

- `source_type` 标为 `derived`。
- `confidence` 不高于 `medium`。
- 不得单独作为市场规模、价格、SLA 或竞品能力的定论依据。

如果 llm-wiki 不可用，记录：

```json
{"provider":"llm-wiki","status":"unavailable","reason":"adapter not configured"}
```

继续使用用户材料和联网搜索，不阻塞任务。

## 去重

按标准化 URL 或本地路径与标题去重。相同来源的多个片段可保留，但共享同一个 `source_id`。不要把 llm-wiki 摘要和其上游网页计为两份独立证据。
