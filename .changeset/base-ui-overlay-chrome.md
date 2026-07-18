---
"@adapttable/base-ui": patch
---

Fix portaled Filters/Columns/Drawer chrome: CSS tokens now apply on portal surfaces so overlays stay opaque above sticky headers, and multi-select chips / selects / drawer title render as real controls.

Put overlay z-index tokens on Base UI **positioners** too — `transform` on the positioner is the stacking context, so z-index on the inner popup alone still lost to sticky table headers.

Render multi-select filter options as label-only chips (no nested checkbox boxes).
