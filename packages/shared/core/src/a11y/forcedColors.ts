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
const RANK = { selection: 1, find: 2, edit: 3, panel: 4, base: 9 } as const;

/** Forced-colours frames for the named parts. */
function framedParts(parts: readonly string[], extra = ""): string {
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
function panelRules(...parts: readonly string[]): ContrastRules {
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

/**
 * The selected range of a keyboard grid.
 *
 * @public
 */
export const SELECTION_CONTRAST_RULES: ContrastRules = {
  rank: RANK.selection,
  css: `@media (forced-colors: active) {
  [data-cell-selected] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}`,
};

/**
 * Find hits and the find bar.
 *
 * @public
 */
export const FIND_CONTRAST_RULES: ContrastRules = {
  rank: RANK.find,
  css: `${/* @__PURE__ */ framedParts(["find-bar"])}
@media (forced-colors: active) {
  [data-cell-match] {
    outline: 2px dashed CanvasText;
    outline-offset: -2px;
  }
  [data-cell-match-current] {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
}`,
};

/**
 * Dirty and changed cells.
 *
 * @public
 */
export const EDIT_CONTRAST_RULES: ContrastRules = {
  rank: RANK.edit,
  css: `[data-dirty]:not([data-cell-match]):not([data-cell-match-current]) {
  outline: 2px dotted currentColor;
  outline-offset: -2px;
}
[data-adapttable-part="batch-edit-cell"] {
  display: block;
}
[data-changed]:not([data-cell-match]):not([data-cell-match-current]) {
  outline: 2px dotted currentColor;
  outline-offset: 2px;
}

@media (forced-colors: active) {
  [data-dirty],
  [data-changed] {
    outline: 2px dotted CanvasText;
    outline-offset: -2px;
    box-shadow: none !important;
  }
}`,
};

/**
 * The saved-views panel's frame.
 *
 * @public
 */
export const SAVED_VIEWS_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("saved-views-panel");

/**
 * The side panel's frame.
 *
 * @public
 */
export const SIDE_PANEL_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("side-panel-header", "side-panel-body");

/**
 * The command palette's frame.
 *
 * @public
 */
export const COMMAND_PALETTE_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("command-list");

/**
 * The grouping panel's frame.
 *
 * @public
 */
export const GROUPING_PANEL_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("grouping-panel");

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
