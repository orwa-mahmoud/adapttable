/**
 * High-contrast chrome that every kit mounts once.
 *
 * Core stays headless: this is a `<style>` tag, not a painted control. Windows
 * High Contrast (`forced-colors: active`) drops authored fills and box-shadows,
 * so focus, selection, dirty cells, validation and find hits each keep a
 * system-color *outline*. `prefers-contrast: more` thickens the same focus
 * outline for kits that expose no contrast hook of their own.
 */
import { useEffect } from "react";

/** Id of the singleton stylesheet, so a second table does not inject again. */
const FORCED_COLORS_STYLE_ID = "adapttable-forced-colors";

/**
 * The stylesheet {@link ensureForcedColorsStyles} injects.
 *
 * Kept as a string so a ninth adapter — or a test — can assert the selectors
 * without mounting a table.
 *
 * @public
 */
export const FORCED_COLORS_CSS = `
[data-dirty]:not([data-cell-match]):not([data-cell-match-current]) {
  outline: 2px dotted currentColor;
  outline-offset: -2px;
}
[aria-invalid="true"]:not([data-cell-match]):not([data-cell-match-current]) {
  outline: 2px double currentColor;
  outline-offset: -2px;
}

@media (forced-colors: active) {
  [data-adapttable-part] {
    forced-color-adjust: auto;
  }
  [data-adapttable-part="table"],
  [data-adapttable-part="find-bar"],
  [data-adapttable-part="saved-views-panel"],
  [data-adapttable-part="side-panel-header"],
  [data-adapttable-part="side-panel-body"],
  [data-adapttable-part="command-list"],
  [data-adapttable-part="grouping-panel"],
  [data-adapttable-part="filter-tree"],
  [data-adapttable-part="pivot-panel"],
  .adapttable-popup,
  .adapttable-drawer,
  .adapttable-select-popup {
    border-color: CanvasText;
    background-color: Canvas;
  }
  [data-grid-cell]:focus,
  [data-grid-cell]:focus-visible,
  [data-adapttable-part] :focus-visible {
    outline: 2px solid Highlight !important;
    outline-offset: 2px;
    box-shadow: none !important;
  }
  [data-cell-selected] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
  [data-cell-match] {
    outline: 2px dashed CanvasText;
    outline-offset: -2px;
  }
  [data-cell-match-current] {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
  [data-dirty] {
    outline: 2px dotted CanvasText;
    outline-offset: -2px;
    box-shadow: none !important;
  }
  [aria-invalid="true"] {
    outline: 2px double CanvasText;
    outline-offset: -2px;
  }
  [data-pinned="start"] {
    border-inline-end: 2px solid CanvasText;
  }
  [data-pinned="end"] {
    border-inline-start: 2px solid CanvasText;
  }
}

@media (prefers-contrast: more) {
  [data-grid-cell]:focus-visible,
  [data-adapttable-part] :focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 2px;
  }
}
`.trim();

/**
 * Inject {@link FORCED_COLORS_CSS} into `document.head` at most once.
 *
 * Safe to call during render or in an effect. A second call is a no-op, so
 * seven shell tables and the antd path can each ask without coordinating.
 *
 * @public
 */
export function ensureForcedColorsStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(FORCED_COLORS_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = FORCED_COLORS_STYLE_ID;
  el.setAttribute("data-adapttable-forced-colors", "");
  el.textContent = FORCED_COLORS_CSS;
  document.head.appendChild(el);
}

/**
 * Mount-time hook that installs the high-contrast stylesheet.
 *
 * Renders nothing. Every published kit mounts this once from its table root.
 *
 * @public
 */
export function ForcedColorsStyle(): null {
  useEffect(() => {
    ensureForcedColorsStyles();
  }, []);
  return null;
}
