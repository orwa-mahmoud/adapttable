/**
 * The card list every React kit draws: which cards it holds and in what
 * order, the list-item attributes each card carries, and the inputs a card's
 * memoized body compares. A kit supplies only its card host, its body and
 * the cells around extra rows and group headers.
 */
import {
  bodyRowEntries,
  type ConfirmHandler,
  type ExtraRowKind,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  rowFlashSignature,
  type TableLabels,
  treeCardStyle,
  type TreeEntry,
} from "@adapttable/core";
import {
  EXTRA_ROW_PARTS,
  type GroupedFlatEntry,
  isExtraEntry,
  orderedCardEntries,
  resolveRowStyle,
  rowStyleSignature,
} from "@adapttable/core/binding";
import type { CSSProperties, ReactNode } from "react";

import type { ColumnDef } from "../columnDef";
import {
  type EditableCellEditing,
  rowEditingSignature,
  rowIsDirty,
} from "../editing/editableCellController";
import type { ReactMobileCardRenderer } from "../rows/mobileCard";
import { rowClickProps } from "../rows/rowClickProps";
import { rowReorderSignature, type RowReorderState } from "../rows/rowReorder";
import type { SharedTableRenderProps } from "../tableRenderProps";
import type { MobileCardSlot } from "./mobileCardsChrome";

/**
 * What a card's memoized body receives from the list. A kit's body adds its
 * own presentation inputs and compares them with
 * {@link mobileCardPropsEqual}.
 *
 * @public
 */
export interface MobileCardBodyProps<TRow> {
  readonly row: TRow;
  readonly index: number;
  /** Stable row id, the selection and expansion key. */
  readonly id: string;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly labels: Required<TableLabels>;
  readonly confirm: ConfirmHandler;
  readonly rowActions?: readonly RowAction<TRow>[];
  readonly rowActionsLayout?: RowActionsLayout;
  readonly renderRowActions?: RowActionsRenderer<TRow>;
  /** The card's class, as the kit composes it. */
  readonly className?: string;
  /** Resolved `rowStyle` and `rowHeight`, compared via `styleSignature`. */
  readonly style?: CSSProperties;
  readonly styleSignature: string;
  /** Flashing column keys, compared in place of `isCellFlashing`. */
  readonly flashSignature: string;
  readonly isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  readonly selected: boolean;
  readonly expanded: boolean;
  /** Present only when selection is enabled. */
  readonly onToggleSelect?: (id: string) => void;
  /** Present only when expansion is enabled. */
  readonly onToggleExpand?: (id: string) => void;
  readonly renderDetail?: (row: TRow) => ReactNode;
  readonly onRowClick?: (row: TRow) => void;
  readonly measureElement?: (node: Element | null) => void;
  /**
   * The editing bundle, uncompared: its identity changes on every keystroke
   * anywhere in the table, and `editingSignature` fingerprints what this
   * card shows. A held card reads live state through the bundle's refs.
   */
  readonly editing?: EditableCellEditing<TRow>;
  /** Page rows for Tab advance, uncompared (see `editing`). */
  readonly rows: readonly TRow[];
  readonly getRowId: (row: TRow) => string;
  readonly editingSignature: string | null;
  /** This card's place in the tree, when the table is one. */
  readonly treeEntry?: TreeEntry<TRow>;
  readonly onToggleTree?: (id: string) => void;
  /** Headless reorder, uncompared; `reorderSignature` carries its churn. */
  readonly rowReorder?: RowReorderState<TRow>;
  readonly windowStart: number;
  readonly rowCount: number;
  /** Rows in the whole dataset, for `aria-setsize`. */
  readonly setSize: number;
  readonly reorderSignature: string | null;
  /** Replaces the card's body. */
  readonly renderCard?: ReactMobileCardRenderer<TRow>;
  readonly part?: string;
  readonly ariaLabel?: string;
}

/** Every body input compared with `Object.is`; the rest are fingerprinted. */
const COMPARED_BODY_PROPS: readonly (keyof MobileCardBodyProps<unknown>)[] = [
  "row",
  "index",
  "id",
  "columns",
  "labels",
  "confirm",
  "rowActions",
  "rowActionsLayout",
  "renderRowActions",
  "className",
  "styleSignature",
  "flashSignature",
  "selected",
  "expanded",
  "onToggleSelect",
  "onToggleExpand",
  "renderDetail",
  "onRowClick",
  "measureElement",
  "editingSignature",
  "reorderSignature",
  "windowStart",
  "rowCount",
  "setSize",
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
  "renderCard",
  "part",
  "ariaLabel",
];

/**
 * The `React.memo` comparator for a card body: a card re-renders only when
 * one of its visual inputs changes, so a search keystroke or another card's
 * checkbox leaves every unchanged card alone.
 *
 * @param kitProps - The kit's own body inputs to compare as well.
 *
 * @public
 */
export function mobileCardPropsEqual<
  TRow,
  TProps extends MobileCardBodyProps<TRow>,
>(
  kitProps: readonly Exclude<keyof TProps, keyof MobileCardBodyProps<TRow>>[]
): (prev: Readonly<TProps>, next: Readonly<TProps>) => boolean {
  const keys: readonly (keyof TProps)[] = [...COMPARED_BODY_PROPS, ...kitProps];
  return (prev, next) => keys.every((key) => Object.is(prev[key], next[key]));
}

/**
 * One row's card as the list hands it to the kit.
 *
 * @public
 */
export interface MobileCardEntry<TRow> {
  readonly key: string;
  readonly row: TRow;
  readonly index: number;
  /** The card is a pinned total rather than a row. */
  readonly pinned: boolean;
  readonly selected: boolean;
  /** `rowClassName`'s answer for this row. */
  readonly rowClass: string | undefined;
  /** The list-item attributes every card host carries. */
  readonly itemProps: Record<string, unknown> & { style: CSSProperties };
  /** The memoized body's inputs. */
  readonly body: MobileCardBodyProps<TRow>;
}

/**
 * The grouping the card list reads: its entries, and the collapse and
 * show-more a group card drives.
 *
 * @public
 */
export type MobileCardGrouping<TRow> = Pick<
  NonNullable<SharedTableRenderProps<TRow>["grouping"]>,
  "entries" | "showMore"
> & { readonly collapsed: { readonly toggle: (key: string) => void } };

/**
 * A group header, footer or show-more entry in the card list.
 *
 * @public
 */
export type MobileCardGroupEntry<TRow> = Extract<
  GroupedFlatEntry<TRow>,
  { kind: "group" | "groupFooter" | "groupMore" }
>;

/**
 * What a kit draws inside the card list.
 *
 * @public
 */
export interface MobileCardSlotKit<TRow> {
  /** A row's card: its host props and its body. */
  readonly card: (entry: MobileCardEntry<TRow>) => MobileCardSlot;
  /** The cell of an extra row, with its part name and content. */
  readonly extraCell: (
    part: string,
    content: ReactNode,
    kind: ExtraRowKind
  ) => ReactNode;
  /** The kit's own props for an extra row's list item. */
  readonly extraProps?: (kind: ExtraRowKind) => Record<string, unknown>;
  /** The props of a group card's list item; a passthrough host by default. */
  readonly groupProps?: Record<string, unknown>;
  /** A group header, footer or show-more card, with the table's grouping. */
  readonly groupCard: (
    entry: MobileCardGroupEntry<TRow>,
    grouping: MobileCardGrouping<TRow>
  ) => ReactNode;
}

/**
 * What the card list reads from the table's render props.
 *
 * @public
 */
export type MobileCardListProps<TRow> = Pick<
  SharedTableRenderProps<TRow>,
  | "table"
  | "rows"
  | "getRowId"
  | "rowEntries"
  | "pinnedTopRows"
  | "pinnedBottomRows"
  | "pinnedSummaryTop"
  | "pinnedSummaryBottom"
  | "extraRows"
  | "assembly"
  | "expansion"
  | "editing"
  | "rowReorder"
  | "windowStart"
  | "cardSetSize"
  | "measureElement"
  | "onRowClick"
  | "rowClassName"
  | "rowStyle"
  | "rowHeight"
  | "isCellFlashing"
  | "renderRowDetail"
  | "renderCard"
  | "rowActionsLayout"
  | "renderRowActions"
  | "confirm"
> & {
  readonly rowActions?: readonly RowAction<TRow>[];
  readonly grouping?: MobileCardGrouping<TRow>;
  readonly tree?: {
    readonly entries: readonly TreeEntry<TRow>[];
    readonly expansion: { readonly toggle: (id: string) => void };
  };
};

/**
 * The card list's slots in order: pinned totals, rows or groups, and extra
 * rows, each built by the kit from the shared entry.
 *
 * @param props - The table's render props.
 * @param kit - The kit's card, extra-row cell and group card.
 *
 * @public
 */
export function mobileCardSlots<TRow>(
  props: Readonly<MobileCardListProps<TRow>>,
  kit: MobileCardSlotKit<TRow>
): MobileCardSlot[] {
  const {
    table,
    rows,
    getRowId,
    rowEntries,
    pinnedTopRows = [],
    pinnedBottomRows = [],
    pinnedSummaryTop = [],
    pinnedSummaryBottom = [],
    extraRows,
    assembly,
    grouping,
    tree,
    expansion: expansionState,
    editing,
    rowReorder,
    windowStart = 0,
    cardSetSize = 0,
    measureElement,
    onRowClick,
    rowClassName,
    rowStyle,
    rowHeight,
    isCellFlashing,
    renderRowDetail,
    renderCard,
    rowActions,
    rowActionsLayout,
    renderRowActions,
    confirm,
  } = props;
  const { columns, labels, selection } = table;
  // Expansion opens a detail panel; without one there is nothing to open.
  const expansion = renderRowDetail ? expansionState : undefined;

  const cardFor = (
    row: TRow,
    index: number,
    key: string,
    treeEntry?: TreeEntry<TRow>
  ): MobileCardSlot => {
    const side = pinnedSummarySideFromId(key);
    const pinned = side !== undefined;
    const only = <T,>(value: T | undefined): T | undefined =>
      pinned ? undefined : value;
    const id = pinned ? key : getRowId(row);
    const part = side ? pinnedSummaryPart(side) : undefined;
    const ariaLabel = pinned ? labels.pinnedSummaryRow : undefined;
    const selected = Boolean(only(selection?.isSelected)?.(id));
    const rowStyleValue = resolveRowStyle(rowStyle, rowHeight, row, index);
    const rowClass = rowClassName?.(row, index);
    const windowed = cardSetSize > rows.length;
    return kit.card({
      key,
      row,
      index,
      pinned,
      selected,
      rowClass,
      itemProps: {
        ref: measureElement,
        "data-index": index,
        // A windowed list has only a slice of its items in the DOM, so each
        // one states where it sits and how many there are; a complete list
        // needs neither, because assistive tech can simply count.
        "aria-posinset": windowed ? windowStart + index + 1 : undefined,
        "aria-setsize": windowed ? cardSetSize : undefined,
        "data-adapttable-part": part ?? "card",
        "data-stagger": "",
        "data-selected": selected ? "" : undefined,
        "aria-label": ariaLabel,
        "data-dirty": rowIsDirty(editing, id) ? "" : undefined,
        role: "listitem",
        ...rowClickProps(row, only(onRowClick), index),
        style: {
          minHeight: "max-content",
          ...treeCardStyle(treeEntry?.level ?? 0),
          ...rowStyleValue,
        },
      },
      body: {
        row,
        index,
        id,
        columns,
        labels,
        confirm,
        rowActions: only(rowActions),
        rowActionsLayout,
        renderRowActions: only(renderRowActions),
        className: rowClass,
        style: rowStyleValue,
        styleSignature: rowStyleSignature(rowStyleValue),
        flashSignature: rowFlashSignature(isCellFlashing, id, columns),
        isCellFlashing,
        selected,
        expanded: Boolean(only(expansion?.isExpanded)?.(id)),
        onToggleSelect: only(selection?.toggle),
        onToggleExpand: only(expansion?.toggle),
        renderDetail: only(renderRowDetail),
        onRowClick: only(onRowClick),
        measureElement,
        editing,
        rows,
        getRowId,
        editingSignature: rowEditingSignature(editing, id),
        treeEntry: only(treeEntry),
        onToggleTree: only(tree?.expansion.toggle),
        rowReorder: only(rowReorder),
        windowStart,
        rowCount: rows.length,
        setSize: cardSetSize,
        reorderSignature: rowReorderSignature(rowReorder, id, index),
        renderCard: only(renderCard),
        part,
        ariaLabel,
      },
    });
  };

  const extraSlot = (entry: {
    key: string;
    kind: ExtraRowKind;
    render?: () => unknown;
  }): MobileCardSlot => ({
    key: entry.key,
    part: EXTRA_ROW_PARTS[entry.kind].row,
    props: {
      role: entry.kind === "separator" ? "separator" : "listitem",
      "aria-label":
        entry.kind === "separator" ? labels.rowSeparator : undefined,
      ...kit.extraProps?.(entry.kind),
    },
    content: kit.extraCell(
      EXTRA_ROW_PARTS[entry.kind].cell,
      entry.kind === "fullWidth" ? (entry.render?.() as ReactNode) : null,
      entry.kind
    ),
  });

  if (grouping) {
    const slots: MobileCardSlot[] = [];
    for (const [index, row] of pinnedSummaryTop.entries()) {
      slots.push(cardFor(row, index, pinnedSummaryRowId("top", index)));
    }
    for (const entry of grouping.entries) {
      if (isExtraEntry(entry)) {
        slots.push(extraSlot(entry));
      } else if (
        entry.kind === "group" ||
        entry.kind === "groupFooter" ||
        entry.kind === "groupMore"
      ) {
        slots.push({
          key: entry.key,
          props: kit.groupProps ?? { "data-passthrough": "" },
          content: kit.groupCard(entry, grouping),
        });
      } else {
        slots.push(cardFor(entry.row, entry.index, entry.key));
      }
    }
    for (const [index, row] of pinnedSummaryBottom.entries()) {
      slots.push(cardFor(row, index, pinnedSummaryRowId("bottom", index)));
    }
    return slots;
  }

  const entries = bodyRowEntries(
    orderedCardEntries(
      rows,
      getRowId,
      rowEntries,
      pinnedTopRows,
      pinnedBottomRows,
      pinnedSummaryTop,
      pinnedSummaryBottom
    ),
    tree
  );
  const flat = assembly?.insertExtraRows
    ? assembly.insertExtraRows(entries, extraRows, (entry) => entry.key)
    : entries;
  return flat.map((slot) =>
    isExtraEntry(slot)
      ? extraSlot(slot)
      : cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
  );
}
