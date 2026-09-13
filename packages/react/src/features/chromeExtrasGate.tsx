/**
 * Mount optional chrome extras in-tree: grouping, tree, expansion, editing.
 *
 * Each feature fills its live slot with a child that calls the hooks.
 * Empty slots pass chrome through unchanged, so the lean table never
 * imports those modules.
 */
import {
  computedAggregateKeys,
  createNeutralTable,
  type RowPinSide,
} from "@adapttable/core";
import { type ReactNode, useRef } from "react";

import { deriveRuntimeOperations } from "../agent/deriveRuntimeOperations";
import type { BaseDataTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import {
  FeatureSlot,
  type TableRuntimeView,
  useFeatureSlotFilled,
  usePublishTableRuntime,
} from "./providers";
import {
  type ChromeExtraSlotProps,
  COLUMN_LAYOUT_LIVE,
  EDITING_LIVE,
  EXPANSION_LIVE,
  FILTER_CHIPS_LIVE,
  GROUPING_LIVE,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  SELECTION_LIVE,
  TREE_LIVE,
} from "./slotKeys";

function ExtraGate<TRow>({
  slot,
  chrome,
  props,
  children,
}: {
  readonly slot: typeof COLUMN_LAYOUT_LIVE;
  readonly chrome: TableChrome<TRow>;
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(slot);
  const slotProps = {
    chrome,
    props,
    children,
  } as unknown as ChromeExtraSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={slot} props={slotProps} />
  ) : (
    children(chrome)
  );
}

/**
 * The order the gates nest in, outermost first.
 *
 * Each one may replace fields the next reads — the layout decides which
 * columns exist before grouping buckets them, and grouping decides the row set
 * before editing addresses a row — so the sequence is the contract, not a
 * detail of how it is written.
 */
const EXTRA_SLOTS = [
  COLUMN_LAYOUT_LIVE,
  FILTER_CHIPS_LIVE,
  GROUPING_LIVE,
  TREE_LIVE,
  SELECTION_LIVE,
  ROW_ACTIONS_LIVE,
  PINNING_LIVE,
  EXPANSION_LIVE,
  EDITING_LIVE,
] as const;

function readableRowLabel<TRow>(chrome: TableChrome<TRow>, row: TRow): string {
  for (const column of chrome.columnLayout.visibleColumns) {
    const formatted = column.formatValue?.(row);
    if (formatted !== undefined && formatted !== "") return formatted;
    const rendered = column.accessor?.(row);
    if (
      typeof rendered === "string" ||
      typeof rendered === "number" ||
      typeof rendered === "boolean"
    ) {
      return String(rendered);
    }
  }
  return chrome.getRowId(row);
}

function RuntimePublisher<TRow>({
  chrome,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  let renderedRows = chrome.source.rows;
  if (chrome.grouping) {
    renderedRows = chrome.grouping.entries.flatMap((entry) =>
      entry.kind === "row" ? [entry.row] : []
    );
  } else if (chrome.tree) {
    renderedRows = chrome.tree.entries.map((entry) => entry.row);
  }
  const engine = chrome.source.tableEngine;
  const runtimeView = {
    rows: chrome.source.rows,
    visibleRows: renderedRows,
    getRowId: chrome.getRowId,
    rowLabel: (row: TRow) => readableRowLabel(chrome, row),
    sortBy: chrome.source.sortBy,
    query: {
      page: chrome.source.page,
      limit: chrome.source.limit,
      total: chrome.source.total,
      search: chrome.source.search,
      sortBy: chrome.source.sortBy,
      sortDir: chrome.source.sortDir,
      setPage: chrome.source.setPage,
      setLimit: chrome.source.setLimit,
      setSearch: chrome.source.setSearch,
      setSort: chrome.source.setSort,
      extra: chrome.source.extra,
      setExtras: chrome.source.setExtras,
      clearExtras: chrome.source.clearExtras,
    },
    filterDefs: chrome.filterDefs,
    filterRegistry: chrome.filterRegistry,
    grouping: chrome.grouping,
    groupingState: {
      groupBy: chrome.source.groupBy,
      aggregateOverrides: chrome.source.groupAggregateOverrides ?? {},
      columns: chrome.allColumns,
      computedAggregateKeys: chrome.grouping
        ? computedAggregateKeys(chrome.grouping.entries)
        : undefined,
      queryAggregates: chrome.source.queryAggregates,
      aggregateOperations: chrome.source.aggregateOperations,
      honorsAggregates: chrome.source.honorsAggregates,
      columnLabel: (key: string) => {
        const column = chrome.allColumns.find(
          (candidate) => candidate.key === key
        );
        if (typeof column?.header === "string") return column.header;
        return column?.mobileLabel ?? key;
      },
      setGroupBy: chrome.source.setGroupBy,
      initializeGroupBy: chrome.source.initializeGroupBy,
      setAggregateOverrides: chrome.source.setGroupAggregateOverrides,
    },
    tree: chrome.tree,
    sourceCapabilities: chrome.source.capabilities,
    selection: chrome.table.selection
      ? {
          selectedIds: chrome.table.selection.selectedIds,
          replace: chrome.table.selection.replace,
        }
      : undefined,
    pinning: livePinning(chrome),
    editing: chrome.editing
      ? {
          onCellEdit: chrome.editing.onCellEdit,
          stageCell: chrome.editing.batch
            ? (row: TRow, rowId: string, columnKey: string, value: string) => {
                chrome.editing?.batch?.setDraft(row, rowId, columnKey, value);
              }
            : undefined,
        }
      : undefined,
  };
  const bindingRef = useRef<{
    visibleRows?: () => readonly TRow[];
    operations?: () => Readonly<Record<string, boolean>>;
  }>({});
  bindingRef.current = {
    visibleRows: () => renderedRows,
    operations: () => deriveRuntimeOperations(runtimeView),
  };

  // The neutral table is created once and keeps whatever binding object it was
  // handed, so it is handed a stable one that reads the CURRENT render's
  // binding on every call. Passing `bindingRef.current` directly would freeze
  // the first render's view, and a capability the host later turns off — or on
  // — would never reach the agent.
  const liveBindingRef = useRef({
    visibleRows: (): readonly TRow[] =>
      bindingRef.current.visibleRows?.() ?? [],
    operations: (): Readonly<Record<string, boolean>> =>
      bindingRef.current.operations?.() ?? {},
  });
  const neutralRef = useRef<ReturnType<typeof createNeutralTable<TRow>> | null>(
    null
  );
  if (engine && !neutralRef.current) {
    neutralRef.current = createNeutralTable(
      engine,
      engine.tableId,
      liveBindingRef.current
    );
  }
  const neutralTable = engine ? (neutralRef.current ?? undefined) : undefined;
  usePublishTableRuntime(renderedRows, chrome.table.labels, {
    ...runtimeView,
    neutralTable,
  });
  return children(chrome);
}

/**
 * What the agent may pin, read from the chrome that renders the pins.
 *
 * Column layout is always present; row pinning arrives only when that feature
 * is composed, which is why the row half is optional and the column half is
 * not.
 */
function livePinning<TRow>(
  chrome: TableChrome<TRow>
): NonNullable<TableRuntimeView<TRow>["pinning"]> {
  const rowPinning = chrome.rowPinning;
  return {
    columns: chrome.columnLayout.state.pinned,
    setColumnPin: chrome.columnLayout.setPinned,
    rows: rowPinning?.state,
    setRowPin: rowPinning
      ? (rowKey: string, side: RowPinSide | undefined) => {
          // Unpin is the inverse of pin, not a layout reset: it takes this
          // row off whichever edge holds it and touches nothing else.
          if (side === undefined) rowPinning.unpin(rowKey);
          else rowPinning.pin(rowKey, side);
        }
      : undefined,
  };
}

/** One link of the chain: gate on this slot, then hand the rest the result. */
function ExtraGateChain<TRow>({
  index,
  chrome,
  props,
  children,
}: {
  readonly index: number;
  readonly chrome: TableChrome<TRow>;
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  const slot = EXTRA_SLOTS[index];
  return slot === undefined ? (
    <RuntimePublisher chrome={chrome}>{children}</RuntimePublisher>
  ) : (
    <ExtraGate slot={slot} chrome={chrome} props={props}>
      {(next) => (
        <ExtraGateChain index={index + 1} chrome={next} props={props}>
          {children}
        </ExtraGateChain>
      )}
    </ExtraGate>
  );
}

/**
 * Overlay grouping, tree, expansion and editing onto base chrome.
 *
 * @public
 */
export function ChromeExtrasGate<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: BaseDataTableProps<TRow>;
  readonly children: (chrome: TableChrome<TRow>) => ReactNode;
}): ReactNode {
  return (
    <ExtraGateChain index={0} chrome={chrome} props={props}>
      {children}
    </ExtraGateChain>
  );
}
