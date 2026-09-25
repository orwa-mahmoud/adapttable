/**
 * The Chrome model: the pure derivations a binding renders a table from —
 * the desktop layout (chrome column widths, pin leads, sticky and pinned
 * styles), the header's sort and alignment attributes, the body's column
 * plan, and the windowing arithmetic.
 *
 * Nothing here renders. Each function maps table state to the geometry,
 * attributes and plans every kit draws with its own components, so two
 * frameworks painting the same table agree on where every cell sits and what
 * it announces. Styles come back as plain objects a binding spreads onto its
 * elements; a merged style keeps the binding's own style type.
 */
import {
  edgePinStyle,
  PIN_Z,
  type PinLeads,
  type PinnedCellStyle,
  pinnedCellStyle,
  type PinOffset,
} from "../columns/columnLayoutModel";
import { columnSizeStyle } from "../columns/columnSizing";
import { pinnedColumnWidth } from "../columns/columnWidths";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { ExtraRow } from "../rows/extraRows";
import type { RowPinSide } from "../rows/rowPinModel";
import { pinnedRowCellStyle } from "../rows/rowPresentation";
import type { CssProperties } from "../style/cssProperties";
import type { ColumnMetadata, Direction, SortDirection } from "../types";
import { REORDER_COLUMN_WIDTH } from "./leanAssembly";

/* ── Desktop layout ────────────────────────────────────────────────── */

/**
 * Width (px) reserved for the leading selection column.
 *
 * @public
 */
export const DESKTOP_SELECTION_WIDTH = 48;

/**
 * Width (px) reserved for the trailing actions column.
 *
 * @public
 */
export const DESKTOP_ACTIONS_WIDTH = 120;

/**
 * Width (px) reserved for the leading expand-chevron column.
 *
 * @public
 */
export const DESKTOP_EXPANSION_WIDTH = 32;

/**
 * Inline style for an absolutely-positioned column-resize handle.
 *
 * @public
 */
export const DESKTOP_RESIZE_HANDLE_STYLE = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
} as const;

/**
 * Per-kit chrome column widths.
 *
 * @public
 */
export interface DesktopChromeWidths {
  /** Leading expand-chevron column. */
  expansion?: number;
  /** Leading selection column. */
  selection?: number;
  /** Trailing actions column. */
  actions?: number;
  /**
   * Whether the expansion column counts toward the start pin lead. A kit
   * whose expander sits inside the first data cell leaves it out.
   */
  includeExpansionInLeads?: boolean;
}

/**
 * Chrome column widths and pin leads.
 *
 * @param options - Which injected columns render, and their widths.
 *
 * @public
 */
export function desktopChromeMetrics(options: {
  expandable: boolean;
  showReorder: boolean;
  hasSelection: boolean;
  showActions: boolean;
  widths?: DesktopChromeWidths;
}): {
  leads: PinLeads;
  extraMinWidth: number;
  expansionLead: number;
  reorderLead: number;
  selectionLead: number;
  expansion: number;
  selection: number;
  actions: number;
  includeExpansionInLeads: boolean;
} {
  const expansion = options.widths?.expansion ?? DESKTOP_EXPANSION_WIDTH;
  const selection = options.widths?.selection ?? DESKTOP_SELECTION_WIDTH;
  const actions = options.widths?.actions ?? DESKTOP_ACTIONS_WIDTH;
  const includeExpansionInLeads =
    options.widths?.includeExpansionInLeads ?? true;
  const expansionLead =
    options.expandable && includeExpansionInLeads ? expansion : 0;
  const reorderLead = options.showReorder ? REORDER_COLUMN_WIDTH : 0;
  const selectionWidth = options.hasSelection ? selection : 0;
  const actionsLead = options.showActions ? actions : 0;
  const start = expansionLead + reorderLead + selectionWidth;
  return {
    leads: { start, end: actionsLead },
    extraMinWidth: start + actionsLead,
    expansionLead,
    reorderLead,
    selectionLead: expansionLead + reorderLead,
    expansion,
    selection,
    actions,
    includeExpansionInLeads,
  };
}

/**
 * Whether any column or injected chrome is pinned.
 *
 * @param columns - Visible columns.
 * @param pinOffset - Pin lookup.
 * @param stickActions - Actions column is user-pinned.
 * @param reorderPinnedLead - Reorder column is start-pinned.
 *
 * @public
 */
export function desktopHasPinned(
  columns: readonly { key: string }[],
  pinOffset: ((key: string) => unknown) | undefined,
  stickActions: boolean,
  reorderPinnedLead: boolean
): boolean {
  return (
    columns.some((column) => pinOffset?.(column.key) != null) ||
    stickActions ||
    reorderPinnedLead
  );
}

/**
 * The desktop scroll box's overflow style.
 *
 * @public
 */
export type DesktopScrollBoxStyle =
  | { maxHeight: number; overflowX: "auto"; overflowY: "auto" }
  | { overflowX: "auto" };

/**
 * Scroll-box style: a maxHeight box scrolls on both axes; otherwise the
 * wrapper scrolls sideways only when something needs it.
 *
 * @param maxHeight - Bounding height, if any.
 * @param scrollX - Whether horizontal overflow is needed.
 *
 * @public
 */
export function desktopScrollBoxStyle(
  maxHeight: number | undefined,
  scrollX: boolean
): DesktopScrollBoxStyle | undefined {
  if (maxHeight != null) {
    return { maxHeight, overflowX: "auto", overflowY: "auto" };
  }
  return scrollX ? { overflowX: "auto" } : undefined;
}

/**
 * Value-comparable digest of every column pin side + inset.
 *
 * @param columns - Visible columns.
 * @param pinOffset - Pin lookup.
 *
 * @public
 */
export function desktopPinSignature(
  columns: readonly { key: string }[],
  pinOffset: ((key: string) => PinOffset | undefined) | undefined
): string {
  return columns
    .map((column) => {
      const pin = pinOffset?.(column.key);
      return pin ? `${column.key}:${pin.side}:${String(pin.inset)}` : "";
    })
    .join("|");
}

/**
 * Measures the two elements of one windowed item: a row and its detail.
 *
 * @public
 */
export interface RowPairMeasurer {
  /** Ref for the row element itself. */
  row: (index: number) => (node: Element | null) => void;
  /** Ref for its detail element, when one is open. */
  detail: (index: number) => (node: Element | null) => void;
}

/**
 * Ref that measures a scroll-body row (never a pinned one).
 *
 * @param pinned - Pin side, if any.
 * @param measureRowPair - Pair measurer when details can open.
 * @param index - Row index in the window.
 * @param measureElement - Single-element measurer.
 *
 * @public
 */
export function desktopRowMeasureRef(
  pinned: RowPinSide | undefined,
  measureRowPair: RowPairMeasurer | undefined,
  index: number,
  measureElement: ((element: Element | null) => void) | undefined
): ((element: Element | null) => void) | undefined {
  if (pinned) return undefined;
  if (measureRowPair) return measureRowPair.row(index);
  return measureElement;
}

/**
 * The ref a row's detail panel carries, so its height counts toward the row's
 * virtual item — the other half of {@link desktopRowMeasureRef}'s pair.
 *
 * @public
 */
export function desktopDetailMeasureRef(
  pinned: RowPinSide | undefined,
  measureRowPair: RowPairMeasurer | undefined,
  index: number
): ((element: Element | null) => void) | undefined {
  if (pinned || !measureRowPair) return undefined;
  return measureRowPair.detail(index);
}

/**
 * A body cell's sticky geometry: its column pin and its row pin.
 *
 * @public
 */
export type DesktopBodyPinStyle = Partial<PinnedCellStyle> & {
  top?: number;
  bottom?: number;
};

/**
 * Body-cell pin style: column sticky + row-pin sticky, geometry only.
 *
 * @param key - Column key.
 * @param pinOffset - Pin lookup.
 * @param leads - Injected-column insets.
 * @param rowPinSide - Row pin side, if any.
 * @param rowPinOffset - Sticky header offset for a pinned row.
 *
 * @public
 */
export function desktopBodyPinStyle(
  key: string,
  pinOffset: ((key: string) => PinOffset | undefined) | undefined,
  leads: PinLeads,
  rowPinSide: RowPinSide | undefined,
  rowPinOffset: number
): DesktopBodyPinStyle | undefined {
  const column = pinnedCellStyle(pinOffset?.(key), PIN_Z.body, leads);
  const rowPin = pinnedRowCellStyle(
    rowPinSide,
    rowPinOffset,
    column !== undefined
  );
  if (!column && !rowPin.position) return undefined;
  return { ...column, ...rowPin };
}

/**
 * A header cell's geometry: its column pin, its width, and whether it must
 * anchor an absolutely-positioned resize handle. A binding merges these over
 * its own sticky-header style.
 *
 * @public
 */
export interface DesktopHeadCellGeometry {
  /** The column's sticky pin, when it is pinned. */
  readonly pin: PinnedCellStyle | undefined;
  /** The width to hold, when one is known. */
  readonly width: number | undefined;
  /** Whether the cell hosts a resize handle, so it needs a positioning box. */
  readonly anchorsResize: boolean;
}

/**
 * Header-cell pin, width and resize anchoring.
 *
 * @param column - The column.
 * @param options - Pin lookup, leads, widths and the resize setter.
 *
 * @public
 */
export function desktopHeadCellGeometry(
  column: { key: string; width?: number | string },
  options: {
    pinOffset?: (key: string) => PinOffset | undefined;
    leads: PinLeads;
    columnWidths?: Readonly<Record<string, number>>;
    setWidth?: (key: string, width: number) => void;
  }
): DesktopHeadCellGeometry {
  const pin = pinnedCellStyle(
    options.pinOffset?.(column.key),
    PIN_Z.headerPinned,
    options.leads
  );
  const width = pin
    ? pinnedColumnWidth(column, options.columnWidths)
    : options.columnWidths?.[column.key];
  return { pin, width, anchorsResize: options.setWidth !== undefined };
}

/**
 * The edge pin of an injected header cell, when a data column on that side
 * is pinned.
 *
 * @public
 */
export function desktopEdgeHeadPin(
  side: "start" | "end",
  active: boolean
): PinnedCellStyle | undefined {
  return edgePinStyle(side, active, PIN_Z.headerPinned);
}

/* ── Body slots ────────────────────────────────────────────────────── */

/**
 * Group-shaped body entries a kit hands to its group header.
 *
 * @public
 */
export type ChromeGroupEntry<TRow> = Extract<
  GroupedFlatEntry<TRow>,
  { kind: "group" | "groupFooter" | "groupMore" }
>;

/**
 * One host-injected extra in the assembled body.
 *
 * @typeParam TNode - The binding's render node.
 * @typeParam TStyle - The binding's inline style.
 *
 * @public
 */
export interface ChromeExtraSlot<TNode = unknown, TStyle = unknown> {
  /** Discriminant for the slot union. */
  kind: "extra";
  /** Stable key for the slot. */
  key: string;
  /** Whether the extra row is a separator or spans the full width. */
  extraKind: "separator" | "fullWidth";
  /** Columns the row covers. */
  colSpan: number;
  /** Content of the row, absent for a bare separator. */
  render?: () => TNode;
  /** Style that makes the row fill its band. */
  fillStyle?: TStyle;
}

/**
 * Virtual-window spacer.
 *
 * @public
 */
export interface ChromeVirtualPadSlot {
  /** Discriminant for the slot union. */
  kind: "virtualPad";
  /** Stable key for the slot. */
  key: "pad-top" | "pad-bottom";
  /** Pixel height standing in for the rows outside the window. */
  height: number;
  /** Columns the row covers. */
  colSpan: number;
}

/**
 * Group header / footer / more row.
 *
 * @public
 */
export interface ChromeGroupSlot<TRow> {
  /** Discriminant for the slot union. */
  kind: "group";
  /** Stable key for the slot. */
  key: string;
  /** The group header this slot renders. */
  entry: ChromeGroupEntry<TRow>;
}

/**
 * A data row, with its wiring already assembled.
 *
 * @typeParam TWiring - What the binding's row renderer takes.
 *
 * @public
 */
export interface ChromeRowSlot<TWiring> {
  /** Discriminant for the slot union. */
  kind: "row";
  /** Stable key for the slot. */
  key: string;
  /** Everything the row renderer needs. */
  wiring: TWiring;
}

/**
 * One visual slot in the assembled body, in reading order.
 *
 * @public
 */
export type ChromeBodySlot<TRow, TWiring, TNode = unknown, TStyle = unknown> =
  | ChromeExtraSlot<TNode, TStyle>
  | ChromeVirtualPadSlot
  | ChromeGroupSlot<TRow>
  | ChromeRowSlot<TWiring>;

/* ── Header attributes ─────────────────────────────────────────────── */

/**
 * A column's logical text alignment.
 *
 * @public
 */
export function columnTextAlign(
  align: string | undefined
): "start" | "center" | "end" {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/**
 * The multi-sort level for a column, if the chain has one.
 *
 * @public
 */
export function sortLevelOf(
  levels: readonly { key: string; dir: SortDirection }[],
  key: string
): { key: string; dir: SortDirection } | undefined {
  return levels.find((level) => level.key === key);
}

/**
 * A column's 1-based position in the sort chain, for a header badge.
 *
 * @public
 */
export function sortIndexOf(
  levels: readonly { key: string; dir: SortDirection }[],
  key: string
): number | undefined {
  const index = levels.findIndex((level) => level.key === key);
  return index === -1 ? undefined : index + 1;
}

/**
 * The `aria-sort` a sortable header announces.
 *
 * @public
 */
export function columnAriaSort(
  column: { readonly key: string; readonly sortable?: boolean },
  sortBy: string | undefined,
  sortDir: SortDirection | undefined
): "ascending" | "descending" | "none" | undefined {
  if (!column.sortable) return undefined;
  if (sortBy !== column.key) return "none";
  return sortDir === "asc" ? "ascending" : "descending";
}

/* ── Prop getters ──────────────────────────────────────────────────── */

/**
 * The sort state header attributes read.
 *
 * @public
 */
export interface ChromeSortState {
  /** Single sort key. */
  readonly sortBy: string | undefined;
  /** Single sort direction. */
  readonly sortDir: SortDirection | undefined;
  /** Multi-column sort chain. */
  readonly sortLevels: readonly { key: string; dir: SortDirection }[];
}

/**
 * Sizing inputs for a header or body cell.
 *
 * @public
 */
export interface ChromeCellSizing {
  /** Flex percentages from `columnFlexShares`. */
  readonly flexShares: Readonly<Record<string, number>>;
  /** User-set widths from the column layout. */
  readonly columnWidths: Readonly<Record<string, number>> | undefined;
}

/**
 * The attributes of the table element.
 *
 * @public
 */
export function tableAttributes(
  dir: Direction | undefined,
  label: string
): { role: "table"; dir: Direction | undefined; "aria-label": string } {
  return { role: "table", dir, "aria-label": label };
}

/**
 * The attributes of a header row.
 *
 * @public
 */
export function headerRowAttributes(): { role: "row" } {
  return { role: "row" };
}

/**
 * The attributes of a header cell: its role and scope, what it announces
 * about sorting, and its logical alignment and size.
 *
 * @public
 */
export function headerCellAttributes<TRow>(
  column: ColumnMetadata<TRow> & { readonly sortable?: boolean },
  sort: ChromeSortState,
  sizing: ChromeCellSizing
): {
  role: "columnheader";
  scope: "col";
  "aria-sort": "ascending" | "descending" | "none" | undefined;
  "data-sort-index": number | undefined;
  "data-column-key": string;
  style: CssProperties;
} {
  const level = sortLevelOf(sort.sortLevels, column.key);
  return {
    role: "columnheader",
    // The HTML half of the statement the role makes, so a cell's header
    // association does not depend on the kit.
    scope: "col",
    "aria-sort": columnAriaSort(
      column,
      level?.key ?? sort.sortBy,
      level?.dir ?? sort.sortDir
    ),
    "data-sort-index": sortIndexOf(sort.sortLevels, column.key),
    "data-column-key": column.key,
    style: cellStyle(column, sizing),
  };
}

/**
 * The attributes of a header's sort button. A shift-click adds the column
 * to a multi-sort chain when multi-sort is on; a plain click single-sorts.
 *
 * @public
 */
export function sortButtonAttributes(
  column: {
    readonly key: string;
    readonly sortable?: boolean;
    readonly header?: unknown;
  },
  options: {
    readonly sortLevels: readonly { key: string; dir: SortDirection }[];
    readonly sortByLabel: string;
    readonly multiSort: boolean | undefined;
    readonly toggleSort: (key: string) => void;
    readonly toggleSortLevel: (key: string) => void;
  }
): {
  type: "button";
  disabled: boolean;
  onClick: (event?: { shiftKey?: boolean }) => void;
  "data-sort-index": number | undefined;
  "aria-label": string;
} {
  return {
    type: "button",
    disabled: !column.sortable,
    onClick: (event) => {
      if (!column.sortable) return;
      if (options.multiSort && event?.shiftKey) {
        options.toggleSortLevel(column.key);
        return;
      }
      options.toggleSort(column.key);
    },
    "data-sort-index": sortIndexOf(options.sortLevels, column.key),
    "aria-label": `${options.sortByLabel}: ${
      typeof column.header === "string" ? column.header : column.key
    }`,
  };
}

/**
 * The attributes of a body row: its role and part name, the id an event is
 * traced back to, its index, and its selection when rows are selectable.
 *
 * @public
 */
export function rowAttributes(
  id: string,
  index: number,
  selected: boolean | undefined
): {
  role: "row";
  "data-adapttable-part": "row";
  "data-row-id": string;
  "data-index": number;
  "aria-selected": boolean | undefined;
} {
  return {
    role: "row",
    "data-adapttable-part": "row",
    "data-row-id": id,
    "data-index": index,
    "aria-selected": selected,
  };
}

/**
 * The attributes of a body cell: its role, the column it belongs to (so
 * auto-sizing and CSS can target one column in any kit), its logical
 * alignment and size.
 *
 * @public
 */
export function cellAttributes<TRow>(
  column: ColumnMetadata<TRow>,
  sizing: ChromeCellSizing
): { role: "cell"; "data-column-key": string; style: CssProperties } {
  return {
    role: "cell",
    "data-column-key": column.key,
    style: cellStyle(column, sizing),
  };
}

/**
 * The attributes of the search input.
 *
 * @public
 */
export function searchInputAttributes(
  value: string,
  labels: { readonly searchPlaceholder: string; readonly search: string },
  onValue: (value: string) => void
): {
  type: "search";
  role: "searchbox";
  value: string;
  placeholder: string;
  "aria-label": string;
  onChange: (event: { currentTarget: { value: string } }) => void;
} {
  return {
    type: "search",
    role: "searchbox",
    value,
    placeholder: labels.searchPlaceholder,
    "aria-label": labels.search,
    onChange: (event) => onValue(event.currentTarget.value),
  };
}

function cellStyle<TRow>(
  column: ColumnMetadata<TRow>,
  sizing: ChromeCellSizing
): CssProperties {
  return {
    textAlign: columnTextAlign(column.align),
    ...columnSizeStyle(
      column,
      sizing.flexShares,
      sizing.columnWidths?.[column.key]
    ),
  };
}

/* ── Body plan ─────────────────────────────────────────────────────── */

/**
 * Which injected columns a body renders around the data cells.
 *
 * @public
 */
export interface ChromeColumnPlan {
  /** The trailing control column, for row actions or row-mode editing. */
  readonly showActions: boolean;
  /** The leading reorder grip column. */
  readonly showReorder: boolean;
  /** The leading expand-chevron column. */
  readonly expandable: boolean;
  /** The leading selection column. */
  readonly hasSelection: boolean;
  /** How many injected cells lead each row. */
  readonly leadingCells: number;
}

/**
 * Plan the injected columns. The trailing control column exists for row
 * actions AND for row-mode's own edit / save / cancel — a row edit with
 * nowhere to be saved from would be a mode nobody can leave.
 *
 * @public
 */
export function chromeColumnPlan(input: {
  readonly rowActionCount: number;
  readonly rowEditing: boolean;
  readonly rowReorder: boolean;
  readonly rowDetail: boolean;
  readonly selection: boolean;
}): ChromeColumnPlan {
  const showActions = input.rowActionCount > 0 || input.rowEditing;
  const leadingCells =
    (input.rowDetail ? 1 : 0) +
    (input.rowReorder ? 1 : 0) +
    (input.selection ? 1 : 0);
  return {
    showActions,
    showReorder: input.rowReorder,
    expandable: input.rowDetail,
    hasSelection: input.selection,
    leadingCells,
  };
}

/**
 * The ids of every pinned row, top and bottom.
 *
 * @public
 */
export function pinnedRowIds<TRow>(
  getRowId: (row: TRow) => string,
  pinnedTop: readonly TRow[] | undefined,
  pinnedBottom: readonly TRow[] | undefined
): Set<string> {
  const ids = new Set<string>();
  for (const row of pinnedTop ?? []) ids.add(getRowId(row));
  for (const row of pinnedBottom ?? []) ids.add(getRowId(row));
  return ids;
}

/**
 * For each extra row placed in front of a data row, the table slots a
 * continuing row span already owns there — an extra row omits a cell in
 * each. Computed once per anchor row.
 *
 * @param extraRows - The host's extra rows.
 * @param coveredSlots - The slots a span owns in front of one row.
 *
 * @public
 */
export function extraRowCoveredSlots(
  extraRows: readonly ExtraRow[] | undefined,
  coveredSlots: (beforeRowId: string) => ReadonlySet<number>
): Map<string, ReadonlySet<number>> {
  const covered = new Map<string, ReadonlySet<number>>();
  for (const extra of extraRows ?? []) {
    if (extra.beforeRowId === undefined) continue;
    if (covered.has(extra.beforeRowId)) continue;
    covered.set(extra.beforeRowId, coveredSlots(extra.beforeRowId));
  }
  return covered;
}

/* ── Windowing ─────────────────────────────────────────────────────── */

/**
 * The keys of a walked model's entries — one shape for groups and trees.
 *
 * @public
 */
export function entryKeys(entries?: readonly { key: string }[]): string[] {
  return entries?.map((entry) => entry.key) ?? [];
}

/**
 * Desktop detail is a sibling of the row, so the window measures the pair.
 * A mobile card nests the detail inside the card — one element, not a pair.
 *
 * @public
 */
export function measureRowDetailAsPair(
  isMobile: boolean,
  renderRowDetail: unknown
): boolean {
  return !isMobile && renderRowDetail !== undefined;
}

/**
 * The dataset index of the first loaded row: the page's offset when paged,
 * zero for an infinite list that holds everything from the top.
 *
 * @public
 */
export function sourceWindowStart(source: {
  readonly paginationMode: string;
  readonly page: number;
  readonly limit: number;
}): number {
  return source.paginationMode === "paged"
    ? Math.max(0, (source.page - 1) * source.limit)
    : 0;
}

/**
 * Document Y of an element — what a window virtualizer wants as its scroll
 * margin, so a list that is not at y=0 does not treat the page chrome above
 * it as already-scrolled rows.
 *
 * @public
 */
export function documentOffsetTop(element: Element): number {
  return Math.max(
    0,
    Math.round(element.getBoundingClientRect().top + globalThis.scrollY)
  );
}

const LIST_SELECTOR =
  '[data-adapttable-part="tbody"], [data-adapttable-part="cards"]';

/**
 * The virtualized list node inside a table root, or the root itself.
 *
 * @public
 */
export function virtualListElement(root: Element | null): Element | null {
  if (!root) return null;
  return root.querySelector(LIST_SELECTOR) ?? root;
}

/**
 * A window virtualizer's scroll margin for a mounted table root or scroll box.
 *
 * @public
 */
export function measureWindowScrollMargin(root: Element | null): number {
  const list = virtualListElement(root);
  return list === null ? 0 : documentOffsetTop(list);
}
