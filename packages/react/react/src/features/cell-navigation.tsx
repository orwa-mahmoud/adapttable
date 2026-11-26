/**
 * Cell navigation — `@adapttable/<kit>/cell-navigation`.
 *
 * The factory and the grid hook live together, so a table that never
 * imports it never carries keyboard-grid state. The hook mounts in-tree
 * as its live stage.
 */
import { type CellRange } from "@adapttable/core";
import {
  cellNavigationChannels,
  cellNavigationInput,
  cellRangeKey,
  coreCellNavigation,
  reportedCellRange,
} from "@adapttable/core/binding";
import { beginCellEdit } from "@adapttable/core/editing";
import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import type { EditableCellEditing } from "../editing/editableCellController";
import { useFindFocus } from "../find/useFindInTable";
import { GridFocusAnnouncer } from "../focus/GridFocusAnnouncer";
import { type GridFocusState, useGridFocus } from "../focus/useGridFocus";
import { RowScrollContext } from "../virtual/rowScroll";
import { GRID_FOCUS_ANNOUNCER_RENDER } from "./areaRegions";
import { useFeatureState } from "./featureState";
import type { LiveStageProps } from "./liveStage";
import { slotRender } from "./providers";
import { type CellNavLiveSlotProps, GRID_FOCUS_ANNOUNCER } from "./slotKeys";
import { CELL_NAV_STAGE } from "./stageKeys";
import { EDITING_STATE } from "./stateKeys";
import type { StaticTableFeature } from "./tableFeature";

/** Build the grid's inputs from the shell and hand them to the grid slot. */
function CellNavStage<TRow>({
  shell,
  live,
  children,
}: LiveStageProps<TRow>): ReactNode {
  "use no memo";
  const props = shell.chromeProps;
  const chrome = shell.chrome;
  const editing = useFeatureState(EDITING_STATE) as
    EditableCellEditing<TRow> | undefined;
  const navProps = {
    options: {
      ...cellNavigationInput({
        source: chrome.source,
        pinnedRows: chrome.pinnedRows,
        columns: chrome.columnLayout.visibleColumns,
        columnsWindowed: shell.tableProps.columnWindow.enabled,
        headerCheckbox: props.columnSelectionCheckbox === true,
      }),
      getRowId: props.rowKey,
      dir: props.dir,
      labels: shell.labels,
      onCut: props.onCellCut,
    },
    hostProps: props,
    pinOffset: chrome.columnLayout.pinOffset,
    record: shell.editHistory.record,
    undo: shell.editHistory.undo,
    redo: shell.editHistory.redo,
    onFind: live.find.openBar,
    matchKeys: live.find.matchKeys,
    currentMatch: live.find.current,
    editing,
    children: (gridFocus: GridFocusState) => children({ ...live, gridFocus }),
  } satisfies CellNavLiveSlotProps<TRow>;
  return <LiveCellNav {...navProps} />;
}

function LiveCellNav<TRow>({
  options,
  hostProps,
  pinOffset,
  record,
  undo,
  redo,
  onFind,
  matchKeys,
  currentMatch,
  editing,
  children,
}: CellNavLiveSlotProps<TRow>): ReactNode {
  // The virtual body above belongs to this table, so it scrolls this table's
  // rows; the context is one module-level value and cannot carry the type.
  const scrollToRow = useContext(RowScrollContext) as
    ((row: TRow) => void) | null;
  const scrollToIndex = useCallback(
    (index: number) => {
      const row = options.rows[index - (options.firstRowIndex ?? 0)];
      if (row !== undefined) scrollToRow?.(row);
    },
    [options.rows, options.firstRowIndex, scrollToRow]
  );
  const gridFocus = useGridFocus({
    ...options,
    // The shell builds the grid inputs without an activate callback. Opening
    // an editor stays in this entry, which is the only module that imports it.
    onActivate: (cell) => {
      const state = editing?.state;
      if (!state) return;
      const windowStart = options.firstRowIndex ?? 0;
      const row = options.rows[cell.row - windowStart];
      const column = options.columns[cell.col];
      if (row === undefined || column === undefined) return;
      beginCellEdit(state, row, column, hostProps.rowKey);
    },
    scrollToRow: options.scrollToRow ?? scrollToIndex,
    enabled: true,
    ...cellNavigationChannels({
      rows: options.rows,
      columns: options.columns,
      firstRowIndex: options.firstRowIndex,
      pinOffset,
      host: hostProps,
      record,
      undo,
      redo,
    }),
    onFind,
    matchKeys,
    currentMatch,
  });
  useFindFocus(
    currentMatch ?? null,
    gridFocus.focusCell,
    gridFocus.selectRange
  );
  const reportRange = useRef(hostProps.onCellRangeChange);
  reportRange.current = hostProps.onCellRangeChange;
  const wired = hostProps.onCellRangeChange !== undefined;
  // A lone focused cell is not a selection, so it reports `null`, and the
  // host hears only when the reported rectangle changes.
  const range = reportedCellRange(gridFocus.range);
  const rangeKey = cellRangeKey(range);
  const latestRange = useRef(range);
  latestRange.current = range;
  useEffect(() => {
    if (!wired) return;
    reportRange.current?.(latestRange.current);
  }, [wired, rangeKey]);
  return children(gridFocus);
}

/**
 * Options for `cellNavigation(…)`.
 *
 * @public
 */
export interface CellNavigationOptions {
  /**
   * Told the selected rectangle whenever it changes, and once on mount —
   * `null` when nothing beyond the focused cell is selected. What a
   * "sum of selection" readout of your own reads.
   */
  readonly onRangeChange?: (range: CellRange | null) => void;
  /** Ctrl/Cmd+X and the menu's Cut, after the clipboard write succeeds. */
  readonly onCut?: (range: CellRange) => void;
  /** Paste into the focused rectangle. */
  readonly onPaste?: (edits: readonly unknown[]) => unknown;
  /** Fill the rectangle from its focus cell. */
  readonly onFill?: (edits: readonly unknown[]) => unknown;
}

/**
 * Make the table a keyboard grid with a focused cell.
 *
 * @public
 */
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return {
    ...coreCellNavigation({
      onRangeChange: options.onRangeChange,
      onCut: options.onCut,
      onPaste: options.onPaste,
      onFill: options.onFill,
    }),
    renders: [
      slotRender(CELL_NAV_STAGE, (props) => <CellNavStage {...props} />),
      slotRender(GRID_FOCUS_ANNOUNCER, (props) => (
        <GridFocusAnnouncer focus={props.focus} />
      )),
      GRID_FOCUS_ANNOUNCER_RENDER,
    ],
  };
}
