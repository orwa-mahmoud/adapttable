/**
 * High-contrast chrome: one `<style>` tag per page, holding the rules of the
 * table's base and of each feature a table on the page composes.
 *
 * Core stays headless: this is a stylesheet, not a painted control. Windows
 * High Contrast (`forced-colors: active`) drops authored fills and box-shadows,
 * so focus, selection, dirty cells, validation and find hits each keep a
 * system-color *outline*. A cell changed in a batch edit takes the dotted mark
 * of a dirty cell, drawn just outside its field, which would cover it.
 * `prefers-contrast: more` thickens the same focus outline for kits that expose
 * no contrast hook of their own.
 *
 * The base holds focus, validation, pinned edges and the frames of the panels
 * a host can render on its own. Range selection, find hits, edit marks and the
 * feature panels arrive with the feature that draws them.
 */

/** Id of the singleton stylesheet, so a second table does not inject again. */
const FORCED_COLORS_STYLE_ID = "adapttable-forced-colors";

/**
 * One block of high-contrast rules.
 *
 * Blocks join the page's stylesheet in `rank` order whatever order tables
 * mount them in, so a later block wins over an earlier one exactly as it
 * would in a single sheet.
 *
 * @public
 */
export interface ContrastRules {
  /** Position in the stylesheet; equal ranks keep the order they joined. */
  readonly rank: number;
  /** The CSS text. */
  readonly css: string;
}

/** Ranks, in the order the rules must cascade. */
export const RANK = {
  selection: 1,
  find: 2,
  edit: 3,
  panel: 4,
  base: 9,
} as const;

/** Forced-colours frames for the named parts. */
export function framedParts(parts: readonly string[], extra = ""): string {
  return `@media (forced-colors: active) {
  ${[...parts.map((part) => `[data-adapttable-part="${part}"]`), extra]
    .filter(Boolean)
    .join(",\n  ")} {
    border-color: CanvasText;
    background-color: Canvas;
  }
}`;
}

/* @__NO_SIDE_EFFECTS__ */
export function panelRules(...parts: readonly string[]): ContrastRules {
  return { rank: RANK.panel, css: framedParts(parts) };
}

/**
 * Every table's rules: focus, validation, pinned edges, and the frames of the
 * table and of the panels a host renders without a feature.
 *
 * @public
 */
export const BASE_CONTRAST_RULES: ContrastRules = {
  rank: RANK.base,
  css: `[aria-invalid="true"]:not([data-cell-match]):not([data-cell-match-current]) {
  outline: 2px double currentColor;
  outline-offset: -2px;
}

@media (forced-colors: active) {
  [data-adapttable-part] {
    forced-color-adjust: auto;
  }
}
${
  /* @__PURE__ */ framedParts(
    ["table", "filter-tree", "pivot-panel"],
    ".adapttable-popup,\n  .adapttable-drawer,\n  .adapttable-select-popup"
  )
}
@media (forced-colors: active) {
  [data-grid-cell]:focus,
  [data-grid-cell]:focus-visible,
  [data-adapttable-part] :focus-visible {
    outline: 2px solid Highlight !important;
    outline-offset: 2px;
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
}`,
};

/** The blocks each page's stylesheet already holds, in rank order. */
const MOUNTED = /* @__PURE__ */ new WeakMap<Element, ContrastRules[]>();

/**
 * Add the base rules and each feature's rules to the page's high-contrast
 * stylesheet, creating it on first use.
 *
 * Safe to call on every render or composition change: a block already on the
 * page is not added again, and the sheet is rewritten only when it grows. A
 * server render has no document and does nothing.
 *
 * @param features - The table's composed features; each may carry one block.
 *
 * @public
 */
export function ensureForcedColorsStyles(
  features: readonly { readonly contrast?: ContrastRules }[] = []
): void {
  if (typeof document === "undefined") return;
  let sheet = document.getElementById(FORCED_COLORS_STYLE_ID);
  if (sheet === null) {
    sheet = document.createElement("style");
    sheet.id = FORCED_COLORS_STYLE_ID;
    sheet.dataset.adapttableForcedColors = "";
    document.head.appendChild(sheet);
  }
  const known = MOUNTED.get(sheet);
  const rules = known ?? [];
  let grew = known === undefined;
  for (const block of [
    BASE_CONTRAST_RULES,
    ...features.map((f) => f.contrast),
  ]) {
    if (block === undefined || rules.includes(block)) continue;
    rules.push(block);
    grew = true;
  }
  if (!grew) return;
  rules.sort((left, right) => left.rank - right.rank);
  MOUNTED.set(sheet, rules);
  sheet.textContent = rules.map((block) => block.css).join("\n\n");
}
