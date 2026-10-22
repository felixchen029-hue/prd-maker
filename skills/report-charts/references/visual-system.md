# Visual system and integration notes · v3.1

Reference reviewed 2026-10-22: [Spectrum UI chart blocks](https://ui.spectrumhq.in/blocks/charts). Its bar, composition and distribution examples informed the study of rounded marks, restrained grids, distinct series colors and fill variants. [Upstream repository](https://github.com/arihantcodes/spectrum-ui) identifies an Apache-2.0 license.

The Portfolio demo was also operated in a real browser: time ranges, a shared time cursor, changing headline values, dashed cost basis and the lower drawdown area informed this adaptation. Its source-code panel required login; the indicated raw source URL returned 404. The public rendered interaction was accessible, but the component source was not. Do not claim it was copied or precisely reproduced.

This integration is an original adaptation in the existing ECharts template. No Spectrum React source, API connector, fonts or data have been copied into this skill. No React/Recharts/Motion/CDN dependency has been added. The existing ECharts vendor license remains with its vendored code.

## Visual decisions

- New spectrum palette: blue #5B86E5, gold #E7AE35, teal #169E88; purple #9875C9 distinguishes unexplained differences. Preserve explicit colors in existing projects.
- White export canvas, quiet dashed grids, rounded bars, consistent categorical colors, signed negative-value color, direct labels and optional aligned tables. Fill effects never change the bar's baseline or magnitude.
- Duotone uses two color intensities within the same mark; striped/dotted/hatch patterns remain native SVG definitions. Outline is a real vector border. Avoid glow and exaggerated shadows in exported reports because they obscure boundaries and reproduce poorly in documents.
- Titles, legends, notes and tables remain vector text. Long table labels wrap and increase row height. Dense endpoint labels are omitted only with a visible note and a table path to full data.
- All templates share title/metadata/footer conventions; new chart-specific caveats state axis units, denominator, sampling level or fallback behavior.

## Workbench

The editor keeps its native HTML/CSS/JS stack. Left navigation groups 16 chart choices by analytical task; the center holds the result and summary; the right inspector holds scope, styles and authored titles/notes. File operations are grouped in menus, with image export as the main action. UI accent stays independent from chart palette.

On narrow screens, preview, chart selection and settings become separate working views. The canvas keeps an explicit horizontal-scroll affordance to preserve text legibility; editing settings and returning to preview keep the same project. Keyboard tabs have arrow/Home/End navigation, dialogs retain native semantics, and menus close on Escape.

## Verification contract

One active financial preview and, while its separate dialog is open, one Portfolio chart. Dispose instances on replacement/close. Interactive HTML enables native ECharts animation and pointers; the shared static renderer disables animation and omits cursor state. Portfolio links both time axes and DOM readouts. It does not stream live quotes or calculate trading indicators.

Financial preview retains the deterministic vector header/legend/table and replaces only its plot with a native interactive instance. Return to layout-edit mode for authored text placement. Portfolio has a dark default, optional light theme, restrained green/red fills, a clearly separate red drawdown region and range controls above the plot. Narrow screens move ranges above the headline and reduce time ticks; a slider and keyboard provide alternate access.

Use verify.mjs for legacy template invariants and verify-v3.mjs for new charts: bin boundaries, quartiles/outliers, signed waterfalls, cumulative shares, zero-margin omission, empty filters, vector fills and repeated-project equality. Also check real browser navigation, data edits/undo, save/reopen, and export byte equality; source-level tests cannot replace rendered inspection.
