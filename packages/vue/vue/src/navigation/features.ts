/** Optional factories adapt shared controllers; the shell projects their models. */
import {
  beginCellEdit,
  cellNavigationChannels,
  selectionStats as computeSelectionStats,
} from "@adapttable/core";
import {
  COLUMN_SELECT,
  coreCellNavigation,
  coreColumnSelectionCheckbox,
  coreFindInTable,
  coreSelectionStats,
  coreStatusBar,
  FIND_BAR,
  slotRender,
  STATUS_BAR,
} from "@adapttable/core/binding";
import type { FeatureMountContext, StaticTableFeature } from "@adapttable/vue";
import { computed, toValue, watch } from "vue";

import { editHistoryModelKey, editingModelKey } from "../layout/modelChannels";
import {
  type CellNavigationOptions,
  FILL_HANDLE_CONTROL,
  FIND_MODEL,
  GRID_ANNOUNCER,
  GRID_FOCUS_MODEL,
  SELECTION_STATS_MODEL,
} from "./contracts";
import { GridFocusAnnouncer } from "./navigationChrome";
import { useFindInTable } from "./useFindInTable";
import { useGridFocus } from "./useGridFocus";
function mountNavigation<TRow>(context: FeatureMountContext<TRow>): void {
  const history = context.state.get(editHistoryModelKey<TRow>());
  const editing = context.state.get(editingModelKey<TRow>());
  const find = context.state.get(FIND_MODEL);
  const rows = computed(() =>
    (context.bodyRows?.value ?? []).map((row) => row.row)
  );
  const grid = useGridFocus(
    () => {
      const host = context.options.value;
      const table = context.table;
      return {
        enabled: !table.isMobile.value,
        rows: rows.value,
        columns: table.columns.value,
        columnsWindowed: host.virtualizeColumns === true,
        rowCount: Math.max(
          context.source.value.total,
          table.windowStart.value + rows.value.length
        ),
        firstRowIndex: table.windowStart.value,
        getRowId: table.rowKey,
        dir: table.dir.value,
        labels: table.labels.value,
        headerCheckbox: host.columnSelectionCheckbox === true,
        scrollToRow: context.scrollToRow,
        scrollToColumn: context.scrollToColumn,
        ...cellNavigationChannels({
          rows: rows.value,
          columns: table.columns.value,
          firstRowIndex: table.windowStart.value,
          pinOffset: table.layout.value.pinOffset,
          host,
          record: (edits) => history.value?.record(edits),
          undo: () => history.value?.undo() ?? 0,
          redo: () => history.value?.redo() ?? 0,
        }),
        isCoveredCell: (cell) => {
          const row =
            context.bodyRows?.value[cell.row - table.windowStart.value];
          const column = table.columns.value[cell.col];
          return (
            !row ||
            !column ||
            !row.cells.some((item) => item.key === column.key)
          );
        },
        onActivate: (cell) => {
          const row = rows.value[cell.row - table.windowStart.value];
          const column = table.columns.value[cell.col];
          if (row !== undefined && column && editing.value)
            beginCellEdit(editing.value.state, row, column, table.rowKey);
        },
        onCut: host.onCellCut,
        reportRange: host.onCellRangeChange,
        onFind: find.value?.openBar,
        matchKeys: find.value?.open ? find.value.matchKeys : undefined,
        currentMatch: find.value?.current,
      };
    },
    { active: context.active }
  );
  watch(grid, (value) => context.state.set(GRID_FOCUS_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
  watch(
    () =>
      find.value?.current
        ? `${find.value.current.row}:${find.value.current.col}`
        : "",
    () => {
      const match = find.value?.current;
      if (match && context.active.value) {
        grid.value.focusCell(match);
        grid.value.selectRange({ anchor: match, head: match });
      }
    },
    { flush: "post" }
  );
}
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return {
    ...coreCellNavigation(options),
    mount: mountNavigation,
    requiredSlots: [FILL_HANDLE_CONTROL],
    renders: [slotRender(GRID_ANNOUNCER, GridFocusAnnouncer)],
  };
}
export function columnSelectionCheckbox(): StaticTableFeature {
  return { ...coreColumnSelectionCheckbox(), requiredSlots: [COLUMN_SELECT] };
}
function mountFind<TRow>(context: FeatureMountContext<TRow>): void {
  const grid = context.state.get(GRID_FOCUS_MODEL);
  const gridEnabled = computed(() => grid.value?.enabled === true);
  const find = useFindInTable(
    () => ({
      rows: (context.bodyRows?.value ?? []).map((row) => row.row),
      columns: context.table.columns.value,
      firstRowIndex: context.table.windowStart.value,
      urlAdapter: context.urlAdapter.value,
      urlKey: toValue(context.options.value.urlKey),
      root: context.root.value,
      get gridNavigation() {
        return gridEnabled.value;
      },
      scrollToRow: context.scrollToRow,
      scrollToColumn: context.scrollToColumn,
    }),
    { active: context.active }
  );
  context.registerViewStateFlush(find.flush);
  watch(find.state, (value) => context.state.set(FIND_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
}
export function findInTable(): StaticTableFeature {
  return { ...coreFindInTable(), mount: mountFind, requiredSlots: [FIND_BAR] };
}
function mountStats<TRow>(context: FeatureMountContext<TRow>): void {
  const grid = context.state.get(GRID_FOCUS_MODEL);
  watch(
    () =>
      computeSelectionStats({
        enabled: true,
        range: grid.value?.range ?? null,
        rows: (context.bodyRows?.value ?? []).map((row) => row.row),
        columns: context.table.columns.value,
        firstRowIndex: context.table.windowStart.value,
      }),
    (stats) => context.state.set(SELECTION_STATS_MODEL, stats),
    { immediate: true, flush: "sync" }
  );
}
export function selectionStats(): StaticTableFeature {
  return {
    ...coreSelectionStats(),
    mount: mountStats,
    requiredSlots: [STATUS_BAR],
  };
}
export function statusBar(): StaticTableFeature {
  return { ...coreStatusBar(), requiredSlots: [STATUS_BAR] };
}
export type { CellNavigationOptions };
export type { CellRange } from "@adapttable/core";
