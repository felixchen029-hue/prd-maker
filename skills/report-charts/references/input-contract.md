# Request contract

This page describes the financial contract. Portfolio uses its own dated value/basis contract in [interactive-html.md](interactive-html.md).

For a new report, provide a JSON object with:

- period: source-confirmed period or a clear missing-period label.
- data: rows with industry, revenue, cost and profit. Monetary amounts accept finite numbers or decimal numeric strings, without currency signs or percent signs.
- chart: revenue, cost, profit, compare, margin, share, stack, pie, lollipop, pareto, scatter, bubble, histogram, boxplot, treemap or waterfall. See [chart-catalog.md](chart-catalog.md).
- theme: spectrum (new-request default), business or vivid. Saved projects keep their theme.
- title: optional report title.
- source: optional object with file, sheet and range.
- style: optional settings below.

Use the example in assets/example.request.json. The generated .project.json is also valid input; it retains raw rows, style, notes and manual positions. Version 1 projects from the earlier workbench are migrated to version 2.

## Style options

| Field | Values |
| --- | --- |
| orientation | horizontal, vertical |
| fill | solid, gradient, texture, gradient-texture, duotone, striped, dotted, outline |
| bins | Integer 5–40, default 12; histogram only |
| rankColors | single, category |
| stackBasis | reported, aligned |
| fontFamily | sans, system, serif |
| width | 560–2400, default 1100 |
| height | 400–2200, minimum requested canvas height |
| top | 0–100; 0 means all |
| scale | 1, 10000, 100000000 |
| unit | Source unit, default 元; confirm it before applying |
| decimals | Integer 0–3 |
| titleSize | 18–42 |
| fontSize, valueSize | 10–24 |
| titleGap | 8–50 |
| plotGap | 12–90 |
| labelGap | 6–40 |
| rowGap | 6–55 |
| barWidth | 10–96 |
| tableGap | 12–100 |
| tableFontSize | 10–22 |
| tableRowHeight | 26–60 |
| showTable, showValues | true, false |
| htmlMode | live (animated pointer preview), static (layout editing) |
| motion | auto (follow reduced-motion preference), off |
| titleAlign | left, center, right |
| primary, costColor, profitColor, gapColor | Six-digit hex color |

Defaults, validation and calculations live in assets/report-charts.cjs. Unknown style fields, invalid enums, missing monetary values, nonfinite values and unsupported project versions fail with an error. No model-provided CSS or script is executed.

## Limits

This is a financial-chart template, not an arbitrary drawing generator. The renderer pins ECharts and uses deterministic text measurements; fonts still need to exist or fall back on the target machine. SVG is portable and keeps text, but OS font substitution can change glyph appearance. PNG uses the locally available fonts.

Supported edits persist through project JSON, including font/spacing, data, chart-specific titles, authored notes, legend labels and positions. Opening HTML uses a local cache scoped to its embedded project seed, so other requests do not inherit its styling.

Vertical bar width is capped to the available category space. Dense value labels are omitted with a visible note; use a summary table or horizontal orientation for full values. Category labels wrap and the canvas expands to fit them. Requested height is a minimum, not an instruction to clip content.

## Template v3 compatibility

The engine version is 3.1.0; financial saved-project schema remains 2. Version 1 is still migrated, and old version 2 projects retain data, style, titles and annotations. New HTML defaults to live preview with automatic motion; these options do not alter static SVG. Histogram tables list intervals/counts/shares; boxplot tables list sample counts/quartiles; bubble tables include record counts. Their analysis values are also returned by render().

Only basic ranking, comparison, stack and lollipop templates use the orientation setting (composition fallback bars can also use it). The editor disables unrelated controls; non-bar templates do not reinterpret unsupported fill or orientation settings. Histogram uses all filtered rows, regardless of Top N. See the catalog for exact semantics.
