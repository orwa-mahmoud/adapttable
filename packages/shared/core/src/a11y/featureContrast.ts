/**
 * High-contrast rules that belong to a feature.
 *
 * They live apart from the base rules so a table that never composes the
 * feature does not download them. A bundler that keeps every export of a
 * module it uses would otherwise ship the feature rules with the base.
 */
import {
  type ContrastRules,
  framedParts,
  panelRules,
  RANK,
} from "./forcedColors";

/** The selected range of a keyboard grid. */
export const SELECTION_CONTRAST_RULES: ContrastRules = {
  rank: RANK.selection,
  css: `@media (forced-colors: active) {
  [data-cell-selected] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}`,
};

/** Find hits and the find bar. */
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

/** Dirty and changed cells. */
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

/** The saved-views panel's frame. */
export const SAVED_VIEWS_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("saved-views-panel");

/** The side panel's frame. */
export const SIDE_PANEL_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("side-panel-header", "side-panel-body");

/** The command palette's frame. */
export const COMMAND_PALETTE_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("command-list");

/** The grouping panel's frame. */
export const GROUPING_PANEL_CONTRAST_RULES: ContrastRules =
  /* @__PURE__ */ panelRules("grouping-panel");
