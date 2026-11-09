/**
 * Kit-independent display helpers shared by every binding's table chrome —
 * logical alignment, the sort-indicator glyph, sticky pinned-cell styles,
 * highlight precedence and the row-memo guard. They return plain style
 * objects, so a React kit spreads them into `style` and an Angular kit binds
 * them with `[ngStyle]`.
 */

import {
  edgePinStyle,
  type PinLeads,
  type PinnedCellStyle,
  pinnedCellStyle,
  type PinOffset,
  type PinSide,
} from "../columns/columnLayoutModel";
import type { ColumnModel } from "../contracts/columns";
import { type CellSpanAppearance, cellSpanMark } from "../rows/cellSpan";

/**
 * Pinned data-cell sticky style with an opaque `background` so scrolled columns
 * don't bleed through the pinned ones. Adapters pass their kit's surface
 * background token as `bg`; a raw `style` object keeps the pixel insets the
 * core layout computes from being mangled by a kit's prop-to-spacing scale.
 *
 * @public
 */
export function pinnedDataCellStyle(
  pin: PinOffset | undefined,
  z: number,
  leads: PinLeads,
  bg: string
): (PinnedCellStyle & { background: string }) | undefined {
  const style = pinnedCellStyle(pin, z, leads);
  return style ? { ...style, background: bg } : undefined;
}

/**
 * Sticky style for a non-data edge cell (expand chevron, selection, actions):
 * flush to its side when a data column on that side is pinned. `shift` insets a
 * left-edge cell past the leading expansion column so the chevron and the
 * selection checkbox pin side by side.
 *
 * @public
 */
export function pinnedEdgeCellStyle(
  side: PinSide,
  active: boolean,
  z: number,
  bg: string,
  shift = 0
): (PinnedCellStyle & { background: string }) | undefined {
  const pin = edgePinStyle(side, active, z);
  if (!pin) return undefined;
  const style: PinnedCellStyle & { background: string } = {
    ...pin,
    background: bg,
  };
  if (shift > 0) style.insetInlineStart = shift;
  return style;
}

/**
 * The row-prop keys (other than the kit's own accent token) that change a
 * desktop row's visuals — the memo guard re-renders a row only when one of
 * these differs. Each adapter appends its theming key (`accentColor`)
 * to this shared base.
 *
 * @public
 */
export const SHARED_DESKTOP_ROW_KEYS = [
  "row",
  "id",
  "index",
  "selected",
  "expanded",
  "size",
  "dir",
  "columns",
  "columnWidths",
  "pinSignature",
  "className",
  "labels",
  "hasSelection",
  "expandable",
  "showActions",
  "showReorder",
  "reorderSignature",
  "rowPinSignature",
  "spanSignature",
  "hasRowClick",
  "columnSpan",
  // Cell focus and the selected range live here too, or a row never learns that
  // one of its cells became focused or selected. Omitting it is why the range
  // was invisible after 2.2.0: the live region announced the new cell (it sits
  // outside the memo) while every row kept its previous render, so no cell ever
  // showed `data-cell-selected`. The state object is memoized as a whole, so
  // this compares one reference and changes only when focus or the range does.
  "gridFocus",
  // A tree row's own place in the hierarchy — depth, whether it is open, and
  // whether its children are loading. Without it a folder's children appear
  // while its chevron stays shut, because the row that owns the chevron never
  // re-renders.
  "treeEntry",
  // Which column carries the chevron, so moving the tree column moves it.
  "treeColumnKey",
  "rowActionsLayout",
  "renderRowActions",
  "cellSpanAppearance",
] as const;

/**
 * Shallow-equal two objects across a fixed key set (the row-memo guard).
 *
 * @public
 */
export function shallowEqualByKeys<T>(
  keys: readonly (keyof T)[],
  prev: Readonly<T>,
  next: Readonly<T>
): boolean {
  return keys.every((key) => prev[key] === next[key]);
}

/**
 * The style {@link mergedCellStyle} returns.
 *
 * @public
 */
export interface MergedCellStyle {
  /** Merged content sits in the middle of the span. */
  textAlign: "center";
  /** Vertically too. */
  verticalAlign: "middle";
  /** One wash across the span, unless the fill is off. */
  background?: string;
}

/**
 * Spreadsheet merge paint: centered content and one fill across the span.
 * `"plain"` (or a 1×1 cell) returns nothing. Adapters pass this as the base
 * to {@link cellHighlightStyle} so a selection or find hit still wins the
 * background. Override the fill with `--adapttable-cell-span-fill`.
 *
 * @param colSpan - Horizontal span on the origin cell.
 * @param rowSpan - Vertical span on the origin cell.
 * @param appearance - `"merged"` (default) or `"plain"`.
 * @param fill - `"off"` keeps centering without a wash (unstyled selection
 *   classes need the background free).
 *
 * @public
 */
export function mergedCellStyle(
  colSpan: number,
  rowSpan: number,
  appearance?: CellSpanAppearance,
  fill: "on" | "off" = "on"
): MergedCellStyle | undefined {
  if (appearance === "plain") return undefined;
  if (cellSpanMark(colSpan, rowSpan) === undefined) return undefined;
  const style: MergedCellStyle = {
    textAlign: "center",
    verticalAlign: "middle",
  };
  if (fill === "on") {
    style.background =
      "var(--adapttable-cell-span-fill, color-mix(in srgb, currentColor 12%, transparent))";
  }
  return style;
}

/**
 * Map a column's logical alignment onto the `"start" | "center" | "end"`
 * value every kit's cell/justify prop accepts. `undefined` defaults to start.
 *
 * @public
 */
export function logicalAlign(
  align: ColumnModel["align"]
): "start" | "center" | "end" {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/**
 * Header sort indicator text derived from a cell's computed sort state
 * (`aria-sort` value): `↑` ascending, `↓` descending, `↕` unsorted. Kits that
 * render the bare arrows as emoji (e.g. Radix Themes' font) append a
 * text-presentation selector on top of this base string.
 *
 * @public
 */
export function sortArrow(sort: unknown): string {
  if (sort === "ascending") return " ↑";
  if (sort === "descending") return " ↓";
  return " ↕";
}

/**
 * Is this cell inside the selected range?
 *
 * Core marks a selected cell with `data-cell-selected` through
 * `gridFocus.getCellProps`, but it cannot colour it: a selection has to look
 * like the kit it lives in, and a hard-coded blue would be wrong in seven of
 * eight. So core answers the question and each adapter answers it with its own
 * theme token — the same division as {@link pinnedDataCellStyle}, which takes
 * the kit's surface colour as an argument.
 *
 * Without this the range was invisible: the attribute reached the DOM in 2.2.0
 * and no adapter styled it, so a user extending a selection saw nothing move.
 *
 * @param props - The props from `getCellProps` / `getCellPropsAt`, or nothing.
 * @returns Whether the cell should render as selected.
 *
 * @public
 */
export function isSelectedCell(
  props: Readonly<Record<string, unknown>> | undefined
): boolean {
  return props?.["data-cell-selected"] !== undefined;
}

/**
 * Is this cell one the find bar matched?
 *
 * @param props - The props from `getCellProps` / `getCellPropsAt`, or nothing.
 * @returns Whether the cell contains a match.
 *
 * @public
 */
export function isMatchedCell(
  props: Readonly<Record<string, unknown>> | undefined
): boolean {
  return props?.["data-cell-match"] !== undefined;
}

/**
 * Is this the match the find walk is currently on?
 *
 * @param props - The props from `getCellProps` / `getCellPropsAt`, or nothing.
 * @returns Whether the cell is the current match.
 *
 * @public
 */
export function isCurrentMatchCell(
  props: Readonly<Record<string, unknown>> | undefined
): boolean {
  return props?.["data-cell-match-current"] !== undefined;
}

/**
 * The fill and outline for the match the find walk is on.
 *
 * A find highlight is the one cell colour that is NOT a kit's to choose. It is
 * a browser convention — the same amber every browser paints Ctrl+F hits in —
 * and a table that answered it in eight different accent colours would be
 * harder to read, not more native. Override the fill with
 * `--adapttable-find-match-current`. The outline is there because colour is
 * not enough: forced-colors drops the fill, and a highlight that is only amber
 * is invisible to anyone who cannot see that hue.
 *
 * @public
 */
export const CURRENT_MATCH_CELL_STYLE = {
  background: "var(--adapttable-find-match-current, rgba(255, 150, 50, 0.75))",
  outline: "2px solid CanvasText",
  outlineOffset: "-2px",
} as const;

/**
 * The fill and outline for every other find match. Override the fill with
 * `--adapttable-find-match`.
 *
 * @public
 */
export const MATCHED_CELL_STYLE = {
  background: "var(--adapttable-find-match, rgba(255, 213, 0, 0.45))",
  outline: "2px dashed CanvasText",
  outlineOffset: "-2px",
} as const;

/**
 * The outline a selected cell keeps when the kit's own selection fill names
 * none, so the range survives `forced-colors`.
 *
 * @public
 */
export const SELECTED_CELL_OUTLINE = {
  outline: "2px solid CanvasText",
  outlineOffset: "-2px",
} as const;

/**
 * Which highlight a cell wears, given everything that might want to colour it.
 *
 * The current match wins over other matches, which win over the selection —
 * the find walk moves the selection with it, so without that order the cell
 * you were sent to would be the one cell not marked as a hit. The kit supplies
 * its selection fill; the find fills are {@link CURRENT_MATCH_CELL_STYLE} and
 * {@link MATCHED_CELL_STYLE}.
 *
 * @param props - The props from `getCellProps` / `getCellPropsAt`, or nothing.
 * @returns The highlight, or `undefined` when nothing highlights this cell.
 *
 * @public
 */
export function cellHighlightKind(
  props: Readonly<Record<string, unknown>> | undefined
): "current-match" | "match" | "selected" | undefined {
  if (isCurrentMatchCell(props)) return "current-match";
  if (isMatchedCell(props)) return "match";
  if (isSelectedCell(props)) return "selected";
  return undefined;
}

/**
 * A cell's style, given everything that might want to colour it.
 *
 * The kit supplies its selection fill and core supplies the find-match fills,
 * both overridable through `--adapttable-find-match` /
 * `--adapttable-find-match-current`. Each highlight also carries an outline so
 * the mark survives `forced-colors` and is never colour-only. The order is
 * {@link cellHighlightKind}'s.
 *
 * @typeParam TStyle - The binding's style object.
 * @param props - The props from `getCellProps` / `getCellPropsAt`, or nothing.
 * @param base - The kit's own cell style (pinning, alignment).
 * @param selected - The kit's fill for a selected cell.
 * @returns The merged style, or `base` when nothing highlights this cell.
 *
 * @public
 */
export function cellHighlightStyle<
  TStyle extends {
    readonly outline?: unknown;
    readonly outlineOffset?: unknown;
  },
>(
  props: Readonly<Record<string, unknown>> | undefined,
  base: TStyle | undefined,
  selected: TStyle
): TStyle | undefined {
  // Spreading a generic keeps it in the result's type; `undefined` would not.
  const own = base ?? ({} as TStyle);
  if (isCurrentMatchCell(props)) return { ...own, ...CURRENT_MATCH_CELL_STYLE };
  if (isMatchedCell(props)) return { ...own, ...MATCHED_CELL_STYLE };
  if (isSelectedCell(props)) {
    return {
      ...own,
      ...selected,
      outline: selected.outline ?? SELECTED_CELL_OUTLINE.outline,
      outlineOffset:
        selected.outlineOffset ?? SELECTED_CELL_OUTLINE.outlineOffset,
    };
  }
  return base;
}

/**
 * The three rows a grouped body renders, all through one component.
 *
 * @public
 */
export type GroupRowKind = "group" | "groupFooter" | "groupMore";

/**
 * The `data-adapttable-part` names for one of those rows.
 *
 * One place decides them, because a header, its footer and its "show more" row
 * are the same component in every kit — and three nested ternaries per kit is
 * how those names drift apart.
 *
 * @param kind - Which of the three the entry is.
 * @returns The part names for its row, cell, card and label.
 *
 * @public
 */
export function groupRowParts(kind: GroupRowKind): {
  row: string;
  cell: string;
  card: string;
  label: string;
} {
  if (kind === "groupMore") {
    return {
      row: "group-more-row",
      cell: "group-more-cell",
      card: "group-more-card",
      label: "group-more-label",
    };
  }
  if (kind === "groupFooter") {
    return {
      row: "group-footer-row",
      cell: "group-footer-cell",
      card: "group-footer-card",
      label: "group-label",
    };
  }
  return {
    row: "group-row",
    cell: "group-cell",
    card: "group-card",
    label: "group-label",
  };
}

/**
 * How far a nested group header sits in from the one above it.
 *
 * Logical padding, so a nested group indents from the right in Arabic and
 * Hebrew without a second rule. One value in core rather than eight in the
 * adapters: nesting that steps by 1.5rem in one kit and 8px in another reads
 * as a bug in whichever the user sees second.
 *
 * @param level - The header's depth, from zero.
 * @returns The style for the header's label cell.
 *
 * @public
 */
export function groupIndentStyle(level: number): {
  paddingInlineStart?: string;
} {
  return level > 0 ? { paddingInlineStart: `${level * 1.5}rem` } : {};
}

/**
 * The caption a mobile card shows beside a cell's value.
 *
 * A card is a list of label/value pairs, not a grid with a header row, so each
 * value has to carry its own caption. `mobileLabel` sets it; an **empty string**
 * deliberately removes it, which is how a card shows a bare value (an avatar, a
 * title line) with no caption above it. Without one, a string `header` is the
 * caption and the column's key is the last resort.
 *
 * Every adapter's card layout resolves this the same way, and it lives here
 * because seven of them once each had their own copy under two different names.
 *
 * @param column - The column being rendered in a card.
 * @returns The caption, or `undefined` when the card should show none.
 *
 * @public
 */
export function resolveMobileLabel(column: {
  readonly key: string;
  readonly header?: unknown;
  readonly mobileLabel?: string;
}): string | undefined {
  if (column.mobileLabel !== undefined) return column.mobileLabel || undefined;
  return typeof column.header === "string" ? column.header : column.key;
}
