# Animated HTML and Portfolio

## Choose the mode

All 16 financial charts have native ECharts entry animation, hover emphasis and value tooltips in “交互预览”. Composition tooltips show both revenue and percent; relationship/distribution tooltips retain the chart-specific units. “排版编辑” restores the static plot and authored-label controls. Saving HTML retains both modes and their runtime; exporting SVG/PNG uses the stable complete layout.

Portfolio is a separate date-based chart: green asset-value line/area, dashed step cost basis and red drawdown area share one time cursor. The headline date/value/difference/basis/drawdown follows the nearest observation. It supports 1W/1M/3M/6M/1Y/ALL, replay, dark/light themes, motion off, Left/Right/Home/End/Escape and a date slider. There is no network feed or live-quote integration.

## Portfolio input

Use `assets/portfolio.example.json` as a runnable **simulated** example, or supply:

```json
{
  "kind": "portfolio",
  "title": "资产组合",
  "currency": "USD",
  "source": {"file": "confirmed-source.csv", "simulated": false},
  "points": [
    {"date": "2026-01-01", "value": 100000, "basis": 90000},
    {"date": "2026-01-02", "value": 98000, "basis": 90000},
    {"date": "2026-01-03", "value": 103000, "basis": 92000}
  ],
  "settings": {"width": 1100, "height": 640, "theme": "dark", "range": "ALL", "motion": "auto"}
}
```

- 2–10,000 unique valid calendar dates in YYYY-MM-DD form. Sorted chronologically, interpreted at UTC midnight; missing days keep their actual time spacing. Duplicate days fail rather than being silently aggregated.
- `value` and `basis` are finite nonnegative amounts in the same currency/unit, up to 1e14. Negative NAV and short-account semantics are outside this contract. Numeric decimal strings are accepted.
- `currency`: uppercase three-letter code, default USD. Recognized symbols include USD/CNY/EUR/GBP/JPY; other codes are displayed literally. No exchange conversion.
- `source.simulated: true` adds a visible demonstration label to HTML, SVG and the manifest warning. Do not use the bundled series to imply real performance.
- Portfolio project schema is 1, distinct from financial schema 2. New requests may use `data` for `points` and `style` for `settings`. Unknown settings fail.
- Width 560–2400 (default 1100), height 440–1200 (default 640), theme dark/light, range as above, motion auto/off. HTML adapts to the viewport; these dimensions primarily define the static export.

Generate using the same CLI:

```sh
node scripts/render.mjs --input assets/portfolio.example.json --output /absolute/path/portfolio --html --png
```

## Calculations and interpretation

- Difference = value − basis. The shown percentage = difference / basis; zero basis produces an undefined percentage (—). This is not a time-weighted or money-weighted return.
- Running peak uses the **complete supplied history through each date**; drawdown = value / running peak − 1. If all values through that date are zero, drawdown is defined as zero. Input-start history is the limit of the calculation.
- Range selection filters observations **after** calculating running peaks. It does not reset the peak. “区间最大回撤” is the minimum of those drawdowns within the selected window, not a fresh-window peak calculation. It can therefore reflect a peak before the window.
- 1W includes the last seven calendar days. Month/year windows subtract calendar months, clamping month-end dates. A sparse range with one observation still shows a visible point and usable controls.
- No interpolation of missing amounts, fabricated dates, benchmark data or external investment-performance claims.

## Animation and delivery

Initial Portfolio draw is 850ms cubic-out; range/value updates are 400ms and headline number changes 160ms. Financial previews use a 650ms initial draw. There is no endless looping. `motion: off` and the system reduced-motion preference suppress the animation while leaving interaction enabled.

Portfolio “保存项目” retains data/settings; “保存动效 HTML” creates a complete standalone page with current data/range/theme/motion. Portfolio does not auto-restore a browser cache. Financial editing retains its existing project-scoped local cache plus explicit project/HTML saving.

Static exports show the selected range's latest observation and full chart. Pointer selection is ephemeral; it is not baked into SVG. ECharts IDs are canonicalized so browser and CLI exports can be compared byte-for-byte. Browser PNG uses a 2× canvas; CLI PNG uses sharp. Pixel-identical PNG across operating systems is not promised because installed fonts differ.

Verify actual rendered motion, linked readouts and saved-HTML reopening in addition to `verify-motion.mjs`. If file-URL automation is blocked, report that restriction; HTTP preview and inline-asset checks alone do not prove direct offline double-click behavior. The bundled output contains no CDN, fetch, external font or service requirement.
