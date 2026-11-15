import {
  type ColumnGroupRecord,
  type ColumnLayoutState,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ColumnDef } from "../columnDef";
import { TableStoreContext } from "../state/tableStoreContext";

export type {
  ColumnLayoutState,
  PinLeads,
  PinnedCellStyle,
  PinOffset,
  PinSide,
} from "@adapttable/core";
export type { UseColumnLayoutResult } from "@adapttable/core";

/** `useColumnLayout` preserves full React column defs in `visibleColumns`. @public */
export interface ReactUseColumnLayoutResult<TRow> extends Omit<
  UseColumnLayoutResult<TRow>,
  "visibleColumns"
> {
  visibleColumns: ColumnDef<TRow>[];
}
export { edgePinStyle, PIN_Z, pinnedCellStyle } from "@adapttable/core";

import {
  columnLayoutVisibleColumns,
  columnPinInsets,
  createColumnLayoutController,
} from "@adapttable/core/binding";

export {
  applyColumnOrder,
  EMPTY_COLUMN_LAYOUT,
} from "@adapttable/core/binding";

/**
 * Options for `useColumnLayout`.
 *
 * @public
 */
export interface UseColumnLayoutOptions<TRow> {
  /** All declared columns (already filtered for the current device layout). */
  columns: readonly ColumnDef<TRow>[];
  /** Controlled layout state. Omit for uncontrolled (internal) state. */
  layout?: ColumnLayoutState;
  /** Change handler; required for the controlled mode to update. */
  onLayoutChange?: (next: ColumnLayoutState) => void;
  /**
   * Persists a user rename in the host's domain model. The layout keeps the
   * display override for URL/storage round-trips; the host remains responsible
   * for updating its column definition when the name is durable application data.
   */
  onColumnRename?: (key: string, name: string) => void;
  /** Initial layout for the uncontrolled mode. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /**
   * When true, `visibleColumns` hides leaves under a collapsed group
   * according to that group's collapse options. Omit and collapse is inert.
   */
  collapsibleColumnGroups?: boolean;
  /** Tree-group collapse options from {@link !flattenColumnTree}. */
  columnGroups?: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
}

/**
 * Headless column-layout state. Uncontrolled by default; pass `layout` +
 * `onLayoutChange` to control it (and persist however you like — localStorage,
 * URL, server). Returns the reordered, visibility-filtered columns to render.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function useColumnLayout<TRow>({
  columns,
  layout,
  onLayoutChange,
  onColumnRename,
  defaultColumnLayout,
  collapsibleColumnGroups = false,
  columnGroups,
}: UseColumnLayoutOptions<TRow>): ReactUseColumnLayoutResult<TRow> {
  // The controller is mutable and must see every render's columns and
  // callbacks: the compiler's cache would skip those hand-overs.
  "use no memo";
  // `onLayoutChange` hears every change, controlled or not. Mutators read
  // the store's latest commit, so two mutations in ONE event handler compose
  // (the second sees the first's result) instead of the last write silently
  // winning; a render hands the host's value back over.
  const table = useContext(TableStoreContext);
  const [controller] = useState(() =>
    createColumnLayoutController<TRow, ColumnDef<TRow>>(defaultColumnLayout, {
      store: table,
    })
  );
  const { store } = controller;
  store.control({ value: layout, onChange: onLayoutChange });
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  // A host commonly writes the accepted name back into its `columns` prop;
  // the controller keeps the declaration a reset restores.
  controller.configure({
    columns,
    onColumnRename,
    collapsibleColumnGroups,
    columnGroups,
  });

  const isHidden = useCallback(
    (key: string) => state.hidden.includes(key),
    [state.hidden]
  );

  const visibleColumns = useMemo(
    () =>
      columnLayoutVisibleColumns(
        columns,
        {
          names: state.names,
          order: state.order,
          hidden: state.hidden,
          collapsedGroups: state.collapsedGroups,
        },
        { collapsibleColumnGroups, columnGroups }
      ),
    [
      columns,
      state.names,
      state.order,
      state.hidden,
      state.collapsedGroups,
      collapsibleColumnGroups,
      columnGroups,
    ]
  );

  // Precompute every pinned column's inset once per layout change — adapters
  // call `pinOffset` per cell per render.
  const pinInsets = useMemo(
    () =>
      columnPinInsets(visibleColumns, {
        pinned: state.pinned,
        widths: state.widths,
      }),
    [state.pinned, state.widths, visibleColumns]
  );

  const pinOffset = useCallback(
    (key: string) => pinInsets.get(key),
    [pinInsets]
  );

  return {
    state,
    visibleColumns,
    isHidden,
    setHidden: controller.setHidden,
    toggleVisible: controller.toggleVisible,
    setPinned: controller.setPinned,
    move: controller.move,
    setOrder: controller.setOrder,
    setWidth: controller.setWidth,
    setName: controller.setName,
    resetName: controller.resetName,
    pinOffset,
    reset: controller.reset,
    toggleColumnGroup: controller.toggleColumnGroup,
  };
}
