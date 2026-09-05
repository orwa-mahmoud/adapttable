/**
 * Mount optional chrome extras in-tree: grouping, tree, expansion, editing.
 *
 * Each feature fills its live slot with a child that calls the hooks.
 * Empty slots pass chrome through unchanged, so the lean table never
 * imports those modules.
 */
import type { ReactNode } from "react";
import { useRef } from "react";

import { createNeutralTable } from "@adapttable/core";
import type { BaseDataTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import { deriveRuntimeOperations } from "../agent/deriveRuntimeOperations";
import {
  FeatureSlot,
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
    grouping: chrome.grouping,
    groupingState: {
      groupBy: chrome.source.groupBy,
      aggregateOverrides: chrome.source.groupAggregateOverrides ?? {},
      columnLabel: (key: string) => {
        const column = chrome.columnLayout.visibleColumns.find(
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
  const neutralRef = useRef<ReturnType<typeof createNeutralTable<TRow>> | null>(
    null
  );
  if (engine && !neutralRef.current) {
    neutralRef.current = createNeutralTable(
      engine,
      engine.tableId,
      bindingRef.current
    );
  }
  const neutralTable = engine ? (neutralRef.current ?? undefined) : undefined;
  usePublishTableRuntime(renderedRows, chrome.table.labels, {
    ...runtimeView,
    neutralTable,
  });
  return children(chrome);
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
