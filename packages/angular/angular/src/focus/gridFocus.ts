/**
 * Keyboard navigation over table cells — the Angular binding.
 *
 * With it on, the table is one tab stop whose interior the arrow keys reach.
 * The keyboard model lives in core's grid-focus controller: the active cell,
 * the selected range, the key dispatch, copy and the announcement. This
 * adapter configures it from the table's signals, follows its snapshot, moves
 * DOM focus after each render, and merges its attributes into the table's.
 * Off, the attributes are the table's own and nothing listens.
 */
import {
  type CellEdit,
  cellNavigationChannels,
  type CellNavigationChannelsOptions,
  type CellRange,
  cellRangeKey,
  createGridFocusController,
  type GridCell,
  gridCellAttributes,
  gridColumnHeaderAttributes,
  gridContainerAttributes,
  gridFillHandleCell,
  type GridFocusControllerOptions,
  gridRowAttributes,
  isGridColumnSelected,
  reportedCellRange,
} from "@adapttable/core";
import {
  afterRenderEffect,
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import type { Attrs } from "../attrContracts";
import type { ColumnDef } from "../columnDef";
import type { DataTable } from "../dataTable";
import type { FindInTableState } from "../find/findInTable";
import { onBrowser } from "../hooks/platform";
import { fromStore, type MaybeSignal, readMaybe } from "../store";

/**
 * Options for {@link injectGridFocus}.
 *
 * @public
 */
export interface GridFocusOptions<TRow> {
  /** The table whose cells the keys move between. */
  readonly table: DataTable<TRow>;
  /** Whether cell navigation is on. Off, the table is a plain table. */
  readonly enabled: MaybeSignal<boolean>;
  /** Enter or F2 on a cell. */
  readonly onActivate?: (cell: GridCell) => void;
  /**
   * Told the selected rectangle whenever it changes — `null` while only a
   * cell is focused. Defaults to the `onRangeChange` a composed
   * `cellNavigation()` carries.
   */
  readonly onRangeChange?: (range: CellRange | null) => void;
  /**
   * The live find state, when the table composed `findInTable()`. The grid
   * marks those cells and Ctrl/Cmd+F opens the bar.
   */
  readonly find?: Signal<FindInTableState>;
  /**
   * Told a range after a cut has reached the clipboard. A context-menu Cut
   * and Ctrl/Cmd+X both use it.
   */
  readonly onCut?: (range: CellRange) => void;
  /** Original host callbacks, before any per-cell history wrapping. */
  readonly host?: MaybeSignal<CellNavigationChannelsOptions<TRow>["host"]>;
  /** Record an entire paste or fill as one history gesture. */
  readonly recordEdits?: (edits: readonly CellEdit<TRow>[]) => void;
  /** Replay the last edit backwards through the host. */
  readonly onUndo?: () => number;
  /** Replay the last undone edit through the host. */
  readonly onRedo?: () => number;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * Cell navigation for a table: its state, and attribute getters that wrap the
 * table's own with the grid's roles, indices and handlers.
 *
 * @public
 */
export interface GridFocus<TRow> {
  /** Whether cell navigation is on. */
  readonly enabled: Signal<boolean>;
  /** The focused cell, or `null` before the grid has been entered. */
  readonly active: Signal<GridCell | null>;
  /** The selected rectangle, or `null`. */
  readonly range: Signal<CellRange | null>;
  /** Selection corner that can display the fill handle. */
  readonly fillHandleCell: Signal<GridCell | null>;
  /** The rectangle previewed while dragging the fill handle. */
  readonly fillPreview: Signal<CellRange | null>;
  /** Localized title for the fill handle. */
  readonly fillHandleLabel: Signal<string>;
  /** Start the core-owned fill gesture. */
  readonly getFillHandleProps: () => Attrs;
  /** What the grid says as focus moves; render it in a live region. */
  readonly announcement: Signal<string>;
  /** Move focus to a cell. */
  readonly focusCell: (cell: GridCell) => void;
  /** Select a rectangle, or clear it. Find uses a single cell. */
  readonly selectRange: (range: CellRange | null) => void;
  /** Whether a whole column is the selection. */
  readonly isColumnSelected: (col: number) => boolean;
  /** Select a whole column, or clear the selection when it already is. */
  readonly toggleColumn: (col: number) => void;
  /** The table element's attributes, the grid's merged in. */
  readonly tableAttrs: () => Attrs;
  /** A header cell's attributes, with its column position. */
  readonly headerCellAttrs: (column: ColumnDef<TRow>, col: number) => Attrs;
  /** A body row's attributes, with its row position. */
  readonly rowAttrs: (row: TRow, index: number) => Attrs;
  /**
   * A body cell's attributes: its address, its roving tab stop and the
   * pointer handlers.
   */
  readonly cellAttrs: (
    column: ColumnDef<TRow>,
    index: number,
    col: number
  ) => Attrs;
  /** Copy the selection, or one cell. A cut also tells {@link GridFocusOptions.onCut}. */
  readonly copyCells: (cell?: GridCell, cut?: boolean) => void;
  /** The grid address of a rendered cell, for a menu opened on it. */
  readonly cellAt: (rowId: string, columnKey: string) => GridCell | undefined;
}

/**
 * Keyboard focus over a table's cells.
 *
 * @param options - See {@link GridFocusOptions}.
 * @returns The grid; see {@link GridFocus}.
 *
 * @public
 */
export function injectGridFocus<TRow>(
  options: GridFocusOptions<TRow>
): GridFocus<TRow> {
  if (!options.injector) assertInInjectionContext(injectGridFocus);
  const injector = options.injector ?? inject(Injector);
  const { table } = options;
  const enabled = computed(() => readMaybe(options.enabled));

  const channels = computed(() =>
    cellNavigationChannels<TRow>({
      rows: table.rows(),
      columns: table.columns(),
      firstRowIndex: table.windowStart(),
      pinOffset: table.layout().pinOffset,
      host: options.host
        ? readMaybe(options.host)
        : (table.featureOptions as CellNavigationChannelsOptions<TRow>["host"]),
      record: options.recordEdits ?? (() => undefined),
      undo: options.onUndo ?? (() => 0),
      redo: options.onRedo ?? (() => 0),
    })
  );

  const configuration = computed((): GridFocusControllerOptions<TRow> => ({
    enabled: enabled(),
    rowCount: table.source().total,
    columns: table.columns(),
    rows: table.rows(),
    getRowId: table.rowKey,
    firstRowIndex: table.windowStart(),
    dir: table.dir(),
    labels: table.labels(),
    onActivate: options.onActivate,
    onFind: options.find
      ? () => {
          options.find?.().openBar?.();
        }
      : undefined,
    onCut: options.onCut,
    ...channels(),
  }));
  const controller = createGridFocusController(untracked(configuration));
  effect(
    () => {
      controller.configure(configuration());
    },
    { injector }
  );
  const snapshot = fromStore(controller, { injector });

  // The DOM follows the state: once a render has produced the cell a move
  // was waiting for, focus it.
  afterRenderEffect(
    () => {
      snapshot();
      table.rows();
      if (enabled()) controller.syncFocus();
    },
    { injector }
  );

  // A lone focused cell is not a selection, so it reports `null`, and the
  // host hears only when the reported rectangle changes.
  const onRangeChange = () =>
    options.onRangeChange ??
    (table.featureOptions.onCellRangeChange as
      ((range: CellRange | null) => void) | undefined);
  const wired = computed(() => onRangeChange() !== undefined);
  const reported = computed(() => reportedCellRange(snapshot().range), {
    equal: (left, right) => cellRangeKey(left) === cellRangeKey(right),
  });
  effect(
    () => {
      const range = reported();
      if (!wired()) return;
      untracked(() => {
        onRangeChange()?.(range);
      });
    },
    { injector }
  );

  // A pointer released outside the table would leave a drag armed.
  effect(
    (onCleanup) => {
      if (!enabled() || !onBrowser(injector)) return;
      onCleanup(controller.watchPointerRelease(window));
    },
    { injector }
  );

  const windowed = (): boolean =>
    table.source().total > table.source().rows.length;

  const cellAttrs = (
    column: ColumnDef<TRow>,
    index: number,
    col: number
  ): Attrs => {
    const cell = { row: table.windowStart() + index, col };
    const { active, range, fillPreview } = snapshot();
    const find = options.find?.();
    const grid = gridCellAttributes(
      {
        enabled: enabled(),
        columnsWindowed: false,
        active,
        firstRowIndex: table.windowStart(),
        range,
        fillPreview,
        matchKeys: find?.open === true ? find.matchKeys : undefined,
        currentMatch: find?.current ?? null,
      },
      cell
    );
    if (!enabled()) return { ...table.cellAttrs(column), ...grid };
    return {
      ...table.cellAttrs(column),
      ...grid,
      onMouseDown: (event: MouseEvent) => {
        controller.pressCell(cell, event);
      },
      onMouseEnter: () => {
        controller.enterCell(cell);
      },
      onMouseUp: controller.releaseCell,
      onFocus: () => {
        controller.trackFocus(cell);
      },
    };
  };

  return {
    enabled,
    active: computed(() => (enabled() ? snapshot().active : null)),
    range: computed(() => (enabled() ? snapshot().range : null)),
    fillHandleCell: computed(() =>
      gridFillHandleCell({
        enabled: enabled(),
        range: snapshot().range,
        canFill: channels().onFill !== undefined,
      })
    ),
    fillPreview: computed(() => (enabled() ? snapshot().fillPreview : null)),
    fillHandleLabel: computed(() => table.labels().gridFillHandle),
    getFillHandleProps: () => ({ onMouseDown: controller.pressFillHandle }),
    announcement: computed(() => (enabled() ? snapshot().announcement : "")),
    focusCell: controller.focusCell,
    selectRange: controller.selectRange,
    isColumnSelected: (col) =>
      isGridColumnSelected(
        {
          enabled: enabled(),
          range: snapshot().range,
          firstRowIndex: table.windowStart(),
          loadedRows: table.rows().length,
        },
        col
      ),
    toggleColumn: controller.toggleColumn,
    tableAttrs: () => {
      const base = table.tableAttrs();
      if (!enabled()) return base;
      return {
        ...base,
        ...gridContainerAttributes({
          enabled: true,
          windowed: windowed(),
          columnsWindowed: false,
          rowCount: table.source().total,
          colCount: table.columns().length,
        }),
        onKeyDown: (event: KeyboardEvent) => {
          if (!event.defaultPrevented) controller.keyDown(event);
        },
        ref: controller.attach,
      };
    },
    headerCellAttrs: (column, col) => ({
      ...table.headerCellAttrs(column),
      ...gridColumnHeaderAttributes(
        { enabled: enabled(), columnsWindowed: false },
        col
      ),
    }),
    rowAttrs: (row, index) => ({
      ...table.rowAttrs(row, index),
      ...gridRowAttributes(
        { enabled: enabled(), windowed: windowed() },
        table.windowStart() + index
      ),
    }),
    cellAttrs,
    copyCells: controller.copyCells,
    cellAt: controller.cellAt,
  };
}
