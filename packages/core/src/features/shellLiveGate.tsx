/**
 * Mount shell interaction hooks in-tree: history, find, grid, export, fullscreen.
 *
 * Features fill the live slots. Empty slots pass inert stubs, so the lean
 * table never imports those hooks.
 */
import type { ReactNode } from "react";

import { rememberFeatureHost } from "./featureHost";
import type { DataTableShellResult } from "../useDataTableShell";
import { undoRedoToolbar, viewControlsToolbar } from "../useTableChrome";
import { FeatureSlot, useFeatureSlotFilled } from "./providers";
import {
  CELL_NAV_LIVE,
  type CellNavLiveSlotProps,
  EDIT_HISTORY_LIVE,
  type EditHistoryLiveSlotProps,
  EXPORT_LIVE,
  type ExportLiveSlotProps,
  FIND_LIVE,
  type FindLiveSlotProps,
  FULLSCREEN_LIVE,
  type FullscreenLiveSlotProps,
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveSlotProps,
} from "./slotKeys";
import {
  DISABLED_EXPORT,
  DISABLED_FIND,
  DISABLED_FULLSCREEN,
  disabledGridFocus,
  disabledHistory,
  windowedTableAria,
} from "./shellLiveStubs";

type HistoryResult<TRow> = {
  history: DataTableShellResult<TRow>["editHistory"];
  onCellEdit: DataTableShellResult<TRow>["chromeProps"]["onCellEdit"];
};

/**
 * Record edits before extras and the body run, so the editing bundle
 * sees the recording commit channel.
 *
 * @public
 */
export function HistoryLiveGate<TRow>({
  shell,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(EDIT_HISTORY_LIVE);
  const apply = (result: HistoryResult<TRow>) => {
    const chromeProps = {
      ...shell.chromeProps,
      onCellEdit: result.onCellEdit,
    };
    rememberFeatureHost(chromeProps, shell.featureHost);
    return children({
      ...shell,
      editHistory: result.history,
      chromeProps,
    });
  };
  const historyProps = {
    editHistory: shell.chromeProps.editHistory,
    columns: shell.chrome.allColumns,
    onCellEdit: shell.chromeProps.onCellEdit,
    children: apply,
  } as unknown as EditHistoryLiveSlotProps<never>;
  if (filled) {
    return <FeatureSlot slot={EDIT_HISTORY_LIVE} props={historyProps} />;
  }
  return apply({
    history: disabledHistory() as DataTableShellResult<TRow>["editHistory"],
    onCellEdit: shell.chromeProps.onCellEdit,
  });
}

/**
 * Overlay find, grid focus, export and fullscreen onto a finished shell.
 *
 * History is applied first by {@link HistoryLiveGate}.
 *
 * @public
 */
export function ShellLiveGate<TRow>({
  shell,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  const findFilled = useFeatureSlotFilled(FIND_LIVE);
  const navFilled = useFeatureSlotFilled(CELL_NAV_LIVE);
  const exportFilled = useFeatureSlotFilled(EXPORT_LIVE);
  const fullscreenFilled = useFeatureSlotFilled(FULLSCREEN_LIVE);
  const statsFilled = useFeatureSlotFilled(SELECTION_STATS_LIVE);

  const props = shell.chromeProps;
  const chrome = shell.chrome;
  const windowStart =
    chrome.source.paginationMode === "paged"
      ? Math.max(0, (chrome.source.page - 1) * chrome.source.limit)
      : 0;
  const columns = chrome.columnLayout.visibleColumns;
  const history = shell.editHistory;

  const findProps = {
    enabled: props.findInTable === true,
    rows: chrome.source.rows,
    columns,
    firstRowIndex: windowStart,
    children: (find: typeof DISABLED_FIND) => {
      const navProps = {
        options: {
          headerCheckbox: props.columnSelectionCheckbox === true,
          rowCount: Math.max(
            chrome.source.total,
            windowStart + chrome.source.rows.length
          ),
          columns,
          columnsWindowed: shell.tableProps.columnWindow.enabled,
          rows: chrome.source.rows,
          firstRowIndex: windowStart,
          dir: props.dir,
          labels: shell.labels,
          onCut: props.onCellCut,
        },
        hostProps: props,
        pinOffset: chrome.columnLayout.pinOffset,
        record: history.record,
        undo: history.undo,
        redo: history.redo,
        onFind: find.openBar,
        matchKeys: find.matchKeys,
        currentMatch: find.current,
        children: (gridFocus: ReturnType<typeof disabledGridFocus>) => {
          const exportProps = {
            exportCsv: props.exportCsv,
            source: chrome.source,
            columns,
            context: {
              selectedIds: chrome.table.selection?.selectedIds,
              getRowId: chrome.getRowId,
              allColumns: chrome.allColumns,
              range: gridFocus.range,
              firstRowIndex: windowStart,
              getCellSpan: props.getCellSpan,
              grouping: chrome.grouping,
              tree: chrome.tree,
              groupTotal: shell.labels.groupTotal,
              summaryRow: props.summaryRow,
            },
            featureHost: shell.featureHost,
            labels: shell.labels,
            pageOnly: chrome.featureNotices.some(
              (notice) => notice.kind === "export-all-page"
            ),
            children: (exportHandler: typeof DISABLED_EXPORT) => {
              const finish = (
                fullscreen: typeof DISABLED_FULLSCREEN,
                stats: DataTableShellResult<TRow>["selectionStats"]
              ) =>
                children(
                  finishShellLive(
                    shell,
                    {
                      history:
                        history as DataTableShellResult<TRow>["editHistory"],
                      find,
                      gridFocus,
                      exportHandler,
                      fullscreen,
                    },
                    stats
                  )
                );
              const fullscreenProps = {
                element: chrome.rootRef.current,
                children: (fullscreen: typeof DISABLED_FULLSCREEN) => {
                  const statsProps = {
                    range: gridFocus.range,
                    rows: chrome.source.rows,
                    columns,
                    firstRowIndex: windowStart,
                    children: (
                      stats: DataTableShellResult<TRow>["selectionStats"]
                    ) => finish(fullscreen, stats),
                  } as unknown as SelectionStatsLiveSlotProps<never>;
                  if (statsFilled) {
                    return (
                      <FeatureSlot
                        slot={SELECTION_STATS_LIVE}
                        props={statsProps}
                      />
                    );
                  }
                  return finish(fullscreen, null);
                },
              } as FullscreenLiveSlotProps;
              if (fullscreenFilled) {
                return (
                  <FeatureSlot slot={FULLSCREEN_LIVE} props={fullscreenProps} />
                );
              }
              return fullscreenProps.children(DISABLED_FULLSCREEN);
            },
          } as unknown as ExportLiveSlotProps<never>;
          if (exportFilled) {
            return <FeatureSlot slot={EXPORT_LIVE} props={exportProps} />;
          }
          return exportProps.children(DISABLED_EXPORT);
        },
      } as unknown as CellNavLiveSlotProps<never>;
      if (navFilled) {
        return <FeatureSlot slot={CELL_NAV_LIVE} props={navProps} />;
      }
      return navProps.children(
        windowedTableAria({
          rowCount: navProps.options.rowCount,
          rowsLength: navProps.options.rows.length,
          columnsLength: navProps.options.columns.length,
          columnsWindowed: navProps.options.columnsWindowed ?? false,
          firstRowIndex: navProps.options.firstRowIndex ?? 0,
        })
      );
    },
  } as unknown as FindLiveSlotProps<never>;
  if (findFilled) {
    return <FeatureSlot slot={FIND_LIVE} props={findProps} />;
  }
  return findProps.children(DISABLED_FIND);
}

function finishShellLive<TRow>(
  shell: DataTableShellResult<TRow>,
  live: {
    history: DataTableShellResult<TRow>["editHistory"];
    find: typeof DISABLED_FIND;
    gridFocus: ReturnType<typeof disabledGridFocus>;
    exportHandler: typeof DISABLED_EXPORT;
    fullscreen: typeof DISABLED_FULLSCREEN;
  },
  stats: DataTableShellResult<TRow>["selectionStats"]
): DataTableShellResult<TRow> {
  const { history, find, gridFocus, exportHandler, fullscreen } = live;
  return {
    ...shell,
    gridFocus,
    find,
    editHistory: history,
    fullscreen,
    selectionStats: stats,
    tableProps: {
      ...shell.tableProps,
      gridFocus,
    },
    toolbarProps: {
      ...shell.toolbarProps,
      ...undoRedoToolbar<TRow>(
        shell.chromeProps.undoRedoButtons,
        history,
        shell.labels
      ),
      ...viewControlsToolbar(shell.chromeProps, fullscreen),
      ...exportHandler,
    },
  };
}
