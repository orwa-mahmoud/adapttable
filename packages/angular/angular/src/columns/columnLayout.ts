/**
 * The user's column layout as signals: which columns are hidden, their
 * order, pinning, widths and names, over core's column-layout controller.
 */
import {
  type ColumnGroupRecord,
  type ColumnLayoutState,
  columnLayoutVisibleColumns,
  columnPinInsets,
  createColumnLayoutController,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  computed,
  effect,
  type Injector,
  type Signal,
  untracked,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import { fromStore, type MaybeSignalOptional, readMaybe } from "../store";

/**
 * The column-layout options a table takes.
 *
 * @public
 */
export interface ColumnLayoutOptions {
  /** The layout, to control it. Omit to let the table keep its own. */
  readonly columnLayout?: MaybeSignalOptional<ColumnLayoutState>;
  /** Every layout change. */
  readonly onColumnLayoutChange?: (next: ColumnLayoutState) => void;
  /** The layout an uncontrolled table starts from. */
  readonly defaultColumnLayout?: Partial<ColumnLayoutState>;
  /**
   * A column was renamed. With it, the column menu offers a rename; the
   * table always keeps the name in its layout.
   */
  readonly onColumnRename?: (key: string, name: string) => void;
}

/**
 * The layout the table renders from: the state, the visible columns in
 * order, and every change a column menu makes — the same shape in every
 * binding.
 *
 * @public
 */
export type ColumnLayout<TRow> = UseColumnLayoutResult<TRow>;

/**
 * The column layout for a table's columns.
 *
 * @returns The layout as a signal, recomputed when the state or the
 *   columns move.
 */
export function columnLayoutFor<TRow>(
  columns: Signal<readonly ColumnDef<TRow>[]>,
  options: ColumnLayoutOptions,
  injector: Injector,
  groups?: {
    /** The header groups over the columns, by id. */
    readonly columnGroups: Signal<ReadonlyMap<string, ColumnGroupRecord<TRow>>>;
    /** Whether the reader may collapse a group to one column. */
    readonly collapsible: boolean;
  }
): Signal<ColumnLayout<TRow>> {
  const resolvedGroups = groups ?? {
    columnGroups: computed(() => new Map()),
    collapsible: false,
  };
  const controller = createColumnLayoutController<TRow, ColumnDef<TRow>>(
    options.defaultColumnLayout
  );
  const { store } = controller;
  const controlled = computed(
    () => options.columnLayout && readMaybe(options.columnLayout)
  );
  store.control({
    value: untracked(controlled),
    onChange: options.onColumnLayoutChange,
  });
  effect(
    () => {
      store.control({
        value: controlled(),
        onChange: options.onColumnLayoutChange,
      });
    },
    { injector }
  );
  const configure = (): void => {
    controller.configure({
      columns: untracked(columns),
      onColumnRename: options.onColumnRename,
      collapsibleColumnGroups: resolvedGroups.collapsible,
      columnGroups: untracked(resolvedGroups.columnGroups),
    });
  };
  configure();
  effect(
    () => {
      columns();
      resolvedGroups.columnGroups();
      configure();
    },
    { injector }
  );
  // The store notifies only for its own value; a controlled value is read
  // from the host's signal, which is what moves when the host hands a new
  // one over.
  const own = fromStore(store, { injector });

  return computed(() => {
    const current = controlled() ?? own();
    const visibleColumns = columnLayoutVisibleColumns(columns(), current, {
      collapsibleColumnGroups: resolvedGroups.collapsible,
      columnGroups: resolvedGroups.columnGroups(),
    });
    const insets = columnPinInsets(visibleColumns, current);
    return {
      state: current,
      visibleColumns,
      isHidden: (key) => current.hidden.includes(key),
      setHidden: controller.setHidden,
      toggleVisible: controller.toggleVisible,
      setPinned: controller.setPinned,
      move: controller.move,
      setOrder: controller.setOrder,
      setWidth: controller.setWidth,
      setName: controller.setName,
      resetName: controller.resetName,
      pinOffset: (key) => insets.get(key),
      reset: controller.reset,
      toggleColumnGroup: controller.toggleColumnGroup,
    };
  });
}
