# Chart catalog · v3

There are also separate Portfolio templates for interactive HTML and static SVG/PNG. See [interactive-html.md](interactive-html.md) for required dates, value, cost basis and drawdown semantics. It is not a seventeenth rendering of industry aggregates.

All 16 templates use the existing industry/revenue/cost/profit contract. They are analytical alternatives, not interchangeable decoration. Rankings and selected-industry plots use the current grouping and customer filter. Top N defaults to five; aggregate totals always describe the complete filtered data, not just visible industries.

| Key | Template | Data meaning and boundary |
| --- | --- | --- |
| revenue | 收入排行 | Industry revenue; horizontal for dense/long categories |
| cost | 成本排行 | Independent source cost |
| profit | 毛利排行 | Independent source profit, preserving negative values |
| margin | 毛利率排行 | Sum(profit) / sum(revenue); zero denominator is missing |
| compare | 经营对比 | Grouped revenue/cost/profit bars in the same monetary unit |
| stack | 收入拆解 | Source cost + source profit + unexplained difference; or explicitly derived cost + source profit. Signed components stack separately, net marker remains visible |
| share | 环形占比 | Nonnegative revenue composition; center shows full filtered net revenue |
| pie | 饼图占比 | Same composition as share, with a full disk |
| lollipop | 棒棒糖图 | Revenue encoded by position; signed values supported |
| pareto | 帕累托图 | Revenue bars (left axis), cumulative share line (right 0–100% axis). Top N plus remainder completes the denominator. The remainder is a grouped category, not an individual ranked industry |
| scatter | 成本与毛利散点 | One point per displayed industry; x=cost, y=source profit; no causal claim |
| bubble | 收入与毛利气泡 | x=revenue, y=weighted margin; bubble area proportional to customer record count, with a minimum 6px diameter for visibility. Zero-revenue margins omitted with a note |
| histogram | 客户收入直方图 | All filtered customer records, equal-width revenue bins, not industry sums; Top N is ignored. Intervals are left-closed/right-open except the last includes its upper bound. Constant samples get a nonzero centered range |
| boxplot | 客户收入箱线图 | Within-industry customer revenue distribution. Quartiles use linear interpolation at (n−1)q; whiskers are extreme observations inside 1.5×IQR fences; outliers are shown. Warn for fewer than four records |
| treemap | 收入矩形树图 | Rectangle area represents positive industry revenue; Top N includes remainder |
| waterfall | 贡献瀑布图 | Cumulative signed industry revenue in ranked order, with remainder and final net total. Does not represent time, cost deductions or a P&L bridge |

Pie/donut/treemap need all industry revenues nonnegative and total revenue positive; Pareto has the same requirement for meaningful cumulative percentages. Otherwise the renderer emits signed bars and a visible warning; no negative rows are silently dropped to make the image work.

## Styles

Themes: spectrum / business / vivid. Eight fill variants: solid / gradient / texture / gradient-texture / duotone / striped / dotted / outline. Fill options apply to marks that support area filling, not arbitrary line/point/boxplot effects. A treemap uses categorical area colors; distribution and relationship charts retain mark-specific semantics.

Existing period text is a report label. The Portfolio mode accepts real dates and asset value/basis fields. Other time-series measures, OHLC candles, order books, cohort retention, calendar heatmaps and target gauges need source fields and explicit contracts. Do not derive them from sorted industries or a report's period label. Simulated Portfolio data is restricted to clearly labeled demos. Discuss missing requirements when requested.
