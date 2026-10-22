---
name: report-charts
description: Generate financial report charts and interactive Portfolio charts as self-contained animated HTML, editable SVG and PNG. Use for industry rankings, breakdowns, composition, relationships, distributions, or dated asset-value and drawdown views with linked pointer interaction.
---

# Report charts

Use the bundled renderer to keep output independent of model drawing ability. Models supply data and bounded options. Native ECharts supplies interactive HTML; shared deterministic options supply SVG/PNG. Both outputs are first-class deliverables when requested.

## Prepare

Confirm source columns, period, currency unit, grouping and profit definition. Keep missing or conflicting facts visible rather than inventing values. Use [references/input-contract.md](references/input-contract.md) for the input contract and [assets/example.request.json](assets/example.request.json) for a runnable example with simulated data.

For the 16 financial templates, use industry, revenue, cost and profit. Inspect Excel read-only and map its columns into the request. Parse numeric text. Do not sum detail and subtotal rows together or average customer margins; calculate aggregate profit divided by aggregate revenue. Preserve source profit rather than replacing it with revenue minus cost. Read [references/chart-catalog.md](references/chart-catalog.md) to choose a template.

For Portfolio, read [references/interactive-html.md](references/interactive-html.md) and use real dates, asset value and cost basis. Its separate contract does not accept industry aggregates as a time series. Use [assets/portfolio.example.json](assets/portfolio.example.json) only for an explicitly labeled demonstration.

## Generate

Resolve this skill's directory and run:

    node scripts/render.mjs --input /absolute/path/request.json --output /absolute/path/output/chart --png --html

- SVG, editable project JSON and a calculation manifest are always produced.
- PNG needs sharp. Prefer the bundled dependency; otherwise install the pinned optional dependency in package.json. SVG/HTML need Node 20+ and the vendored ECharts file only.
- Financial HTML includes the editor and animated, pointer-enabled preview; Portfolio HTML includes linked value/basis/drawdown plots, range controls, replay, keyboard navigation and a date slider. All assets and source data are embedded.
- Financial preview has separate “交互预览” and “排版编辑” modes. Static SVG/PNG always export the complete deterministic layout, without a transient cursor or animation frame.
- The financial workbench's Portfolio button opens an independent, labeled demo with its own open/save operations; it does not reinterpret the current financial source.
- Keep data, width, settings and template version fixed for repeatable SVG geometry. The manifest records the SVG hash.
- Optional overrides: --chart with a financial key or portfolio; --theme spectrum/business/vivid for financial charts, dark/light for Portfolio. Saved Portfolio JSON is detected automatically.

## Templates and editing

New requests default to the spectrum theme: restrained blue, gold and teal, rounded bars, quiet axes and consistent labels. Existing projects retain their saved colors and theme. Read [references/visual-system.md](references/visual-system.md) for the Spectrum UI visual study, attribution and integration boundaries.

Start with gradient fills and semantic series colors. Choose solid, gradient, texture, gradient-texture, duotone, striped, dotted or outline. These fills apply to bar/pie-based templates; other marks use their own encoding. For rankings, category colors are optional. Prefer horizontal bars for more than eight industries or long names. Change request options rather than generating fresh CSS or SVG coordinates.

The reported stack basis shows cost + source profit + unallocated difference = revenue. The aligned basis shows derived cost (revenue minus source profit) + source profit; label the cost as derived. Never call an unexplained discrepancy delivery cost. Negative components separate by sign; the net-income marker and note explain the difference. Never put negative income into a pie chart.

Use showTable to add an aligned summary table. Font, title/plot/label gaps, bar width, row spacing and table spacing are editable. Preserve the saved project when changing data so manual edits survive.

Histogram bins all filtered customer records, independent of Top N. Boxplots summarize customer revenues within each displayed industry, with interpolated quartiles and Tukey 1.5×IQR whiskers; outliers are retained. Pareto, pie, donut, treemap and waterfall retain remaining industries as an explicit aggregate when Top N is selected. Negative/nonpositive totals use signed-bar fallbacks for charts whose areas or cumulative percentages would otherwise mislead. Bubble charts omit undefined zero-revenue margins with a visible note.

Never substitute industry ordering for time. Portfolio supports dated value/basis data now; other trend/area use cases still need confirmed time and measure fields. Candlesticks need OHLC; target gauges need confirmed targets; cohorts need cohort and elapsed-period fields. Discuss missing contracts before extending those templates.

## Verify and deliver

Check manifest totals and grouping against the source independently. Visually inspect the PNG at the intended size; fix clipping or crowding with options. Verify vector text and gradient/pattern definitions. Valid JSON does not establish correct business interpretation.

Run node scripts/verify.mjs, node scripts/verify-v3.mjs and node scripts/verify-motion.mjs after relevant renderer changes. In a real browser, verify an intermediate animation frame, mouse-linked readouts, range selection, keyboard controls, motion off, narrow layout, saved-HTML reopening and static export equality. Verify offline opening separately where browser tooling permits it; report any untested condition accurately. Keep the workbench self-contained with the existing ECharts runtime; do not add React, Recharts, Motion or remote CDNs just to reproduce a reference style.

Deliver SVG/PNG and editable HTML or project JSON. Revisions should update that project and rerun the same command. Do not claim model API compatibility tests or document-platform paste tests that were not performed. External uploads or messages still require authorization.
