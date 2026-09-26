import {
  applyColumnOrder,
  type ColumnGroupRecord,
  type ColumnLayoutState,
  type ControllableStoreOptions,
  declaredColumnName,
  EMPTY_COLUMN_LAYOUT,
  FALLBACK_PIN_WIDTH,
  initialColumnLayout,
  marriedOrderHolds,
  parsePxWidth,
  type PinSide,
  type UseColumnLayoutResult,
  withColumnHidden,
  withColumnMoved,
  withColumnOrder,
  withColumnPinned,
  withColumnWidth,
} from "@adapttable/core";
import {
  applyCollapsedColumnGroups,
  toggleCollapsedColumnGroup,
} from "@adapttable/core/binding";
import { useCallback, useMemo, useRef } from "react";

import type { ColumnDef } from "../columnDef";
import { useControllableStore } from "../hooks/useControllableStore";
import { applyReactColumnNames } from "./reactColumns";

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
export {
  applyColumnOrder,
  edgePinStyle,
  EMPTY_COLUMN_LAYOUT,
  PIN_Z,
  pinnedCellStyle,
} from "@adapttable/core";

function rememberDeclaredName(
  key: string,
  declared: string,
  declaredNames: Map<string, string>,
  renamedKeys: Set<string>,
  staleEcho: string | undefined
): void {
  if (renamedKeys.has(key)) return;
  if (staleEcho === undefined || declared !== staleEcho) {
    declaredNames.set(key, declared);
  }
  renamedKeys.add(key);
}

function reconcileStaleEcho(
  key: string,
  declared: string,
  declaredNames: Map<string, string>,
  renamedKeys: Set<string>,
  staleEchoes: Map<string, string>,
  staleEcho: string
): void {
  if (declared === staleEcho) return;
  staleEchoes.delete(key);
  renamedKeys.delete(key);
  declaredNames.set(key, declared);
}

function dropMissingRenameKeys(
  liveKeys: ReadonlySet<string>,
  declaredNames: Map<string, string>,
  renamedKeys: Set<string>,
  staleEchoes: Map<string, string>
): void {
  const tracked = new Set([
    ...declaredNames.keys(),
    ...renamedKeys,
    ...staleEchoes.keys(),
  ]);
  for (const key of tracked) {
    if (liveKeys.has(key)) continue;
    declaredNames.delete(key);
    renamedKeys.delete(key);
    staleEchoes.delete(key);
  }
}

/**
 * Keep the declaration that preceded an active rename as the reset target,
 * then resume tracking the live header once that override ends and the host
 * is no longer echoing the discarded name.
 */
function syncRenameBaselines<TRow>(
  columns: readonly ColumnDef<TRow>[],
  names: Readonly<Record<string, string>> | undefined,
  declaredNames: Map<string, string>,
  renamedKeys: Set<string>,
  staleEchoes: Map<string, string>
): void {
  const liveKeys = new Set<string>();
  for (const column of columns) {
    liveKeys.add(column.key);
    const declared = declaredColumnName(column);
    const override = names?.[column.key];
    const staleEcho = staleEchoes.get(column.key);

    if (override !== undefined) {
      rememberDeclaredName(
        column.key,
        declared,
        declaredNames,
        renamedKeys,
        staleEcho
      );
      staleEchoes.delete(column.key);
      continue;
    }

    if (staleEcho !== undefined) {
      reconcileStaleEcho(
        column.key,
        declared,
        declaredNames,
        renamedKeys,
        staleEchoes,
        staleEcho
      );
      continue;
    }

    // Host dropped the override through controlled `layout.names` without
    // calling resetName. Resume the live declaration so a later rename
    // or reset does not restore the discarded label.
    if (renamedKeys.has(column.key)) {
      renamedKeys.delete(column.key);
    }
    declaredNames.set(column.key, declared);
  }

  dropMissingRenameKeys(liveKeys, declaredNames, renamedKeys, staleEchoes);
}

function endRenameOverride(
  key: string,
  lastOverride: string | undefined,
  renamedKeys: Set<string>,
  staleEchoes: Map<string, string>
): void {
  renamedKeys.delete(key);
  if (lastOverride !== undefined) staleEchoes.set(key, lastOverride);
}

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

/** The layout store reports every change and reads its own commits. */
const LAYOUT_STORE_OPTIONS: ControllableStoreOptions<ColumnLayoutState> = {
  observeUncontrolled: true,
  readsOwnCommits: true,
};

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
  // `onLayoutChange` hears every change, controlled or not. Mutators read
  // `store.current()`, so two mutations in ONE event handler compose (the
  // second sees the first's result) instead of the last write silently
  // winning; a render hands the host's value back over.
  const [state, store] = useControllableStore(
    () => initialColumnLayout(defaultColumnLayout),
    { value: layout, onChange: onLayoutChange },
    LAYOUT_STORE_OPTIONS
  );
  // A host commonly writes the accepted name back into its `columns` prop.
  // Capture the declaration when a rename becomes active and ignore that
  // echo only while the override (or its stale post-reset echo) is live.
  const declaredNamesRef = useRef(new Map<string, string>());
  const renamedKeysRef = useRef(new Set<string>());
  const staleEchoesRef = useRef(new Map<string, string>());
  syncRenameBaselines(
    columns,
    state.names,
    declaredNamesRef.current,
    renamedKeysRef.current,
    staleEchoesRef.current
  );

  const commit = store.commit;

  const isHidden = useCallback(
    (key: string) => state.hidden.includes(key),
    [state.hidden]
  );

  const setHidden = useCallback(
    (key: string, hidden: boolean) => {
      const current = store.current();
      const next = withColumnHidden(current, key, hidden);
      if (next !== current) commit(next);
    },
    [store, commit]
  );

  const toggleVisible = useCallback(
    (key: string) => setHidden(key, !store.current().hidden.includes(key)),
    [store, setHidden]
  );

  const setPinned = useCallback(
    (key: string, side: PinSide | undefined) =>
      commit(withColumnPinned(store.current(), key, side)),
    [store, commit]
  );

  const setWidth = useCallback(
    (key: string, width: number | undefined) =>
      commit(withColumnWidth(store.current(), key, width)),
    [store, commit]
  );

  const setName = useCallback(
    (key: string, nextName: string) => {
      const column = columns.find((candidate) => candidate.key === key);
      if (column?.renameable !== true || !onColumnRename) return;
      const name = nextName.trim();
      if (name === "") return;
      const current = store.current();
      const declared =
        declaredNamesRef.current.get(key) ?? declaredColumnName(column);
      const effective = current.names?.[key] ?? declared;
      if (effective === name) return;
      const names = { ...current.names };
      if (name === declared) {
        const lastOverride = names[key];
        delete names[key];
        endRenameOverride(
          key,
          lastOverride,
          renamedKeysRef.current,
          staleEchoesRef.current
        );
      } else {
        renamedKeysRef.current.add(key);
        names[key] = name;
      }
      commit({
        ...current,
        names: Object.keys(names).length > 0 ? names : undefined,
      });
      onColumnRename(key, name);
    },
    [store, columns, commit, onColumnRename]
  );

  const resetName = useCallback(
    (key: string) => {
      const column = columns.find((candidate) => candidate.key === key);
      const current = store.current();
      if (
        column?.renameable !== true ||
        !onColumnRename ||
        current.names?.[key] === undefined
      ) {
        return;
      }
      const lastOverride = current.names?.[key];
      const names = { ...current.names };
      delete names[key];
      endRenameOverride(
        key,
        lastOverride,
        renamedKeysRef.current,
        staleEchoesRef.current
      );
      commit({
        ...current,
        names: Object.keys(names).length > 0 ? names : undefined,
      });
      onColumnRename(
        key,
        declaredNamesRef.current.get(key) ?? declaredColumnName(column)
      );
    },
    [store, columns, commit, onColumnRename]
  );

  const namedColumns = useMemo(
    () => applyReactColumnNames(columns, state.names),
    [columns, state.names]
  );

  const visibleColumns = useMemo((): ColumnDef<TRow>[] => {
    const ordered = applyColumnOrder(namedColumns, state.order).filter(
      (c) => !state.hidden.includes(c.key)
    );
    if (!collapsibleColumnGroups) return ordered as ColumnDef<TRow>[];
    return applyCollapsedColumnGroups(
      ordered,
      state.collapsedGroups ?? [],
      columnGroups
    ) as ColumnDef<TRow>[];
  }, [
    namedColumns,
    state.order,
    state.hidden,
    state.collapsedGroups,
    collapsibleColumnGroups,
    columnGroups,
  ]);

  const toggleColumnGroup = useCallback(
    (id: string) => {
      if (!collapsibleColumnGroups) return;
      const current = store.current();
      const nextIds = toggleCollapsedColumnGroup(
        current.collapsedGroups ?? [],
        id
      );
      commit({
        ...current,
        collapsedGroups: nextIds.length > 0 ? nextIds : undefined,
      });
    },
    [store, collapsibleColumnGroups, commit]
  );

  /** Whether an order keeps every column group's members together. */
  const orderHolds = useCallback(
    (order: readonly string[]) =>
      !columnGroups || marriedOrderHolds([...order], columnGroups),
    [columnGroups]
  );

  const move = useCallback(
    (key: string, toIndex: number) => {
      const latest = store.current();
      const current = applyColumnOrder(columns, latest.order).map((c) => c.key);
      const next = withColumnMoved(latest, current, key, toIndex, orderHolds);
      if (next) commit(next);
    },
    [store, commit, columns, orderHolds]
  );

  const setOrder = useCallback(
    (order: readonly string[]) => {
      const latest = store.current();
      const current = applyColumnOrder(columns, latest.order).map(
        (column) => column.key
      );
      const next = withColumnOrder(latest, current, order, orderHolds);
      if (next) commit(next);
    },
    [store, commit, columns, orderHolds]
  );

  const reset = useCallback(() => {
    const names = store.current().names ?? {};
    const renamedKeys = Object.keys(names);
    for (const key of renamedKeys) {
      endRenameOverride(
        key,
        names[key],
        renamedKeysRef.current,
        staleEchoesRef.current
      );
    }
    commit(EMPTY_COLUMN_LAYOUT);
    for (const key of renamedKeys) {
      const column = columns.find((candidate) => candidate.key === key);
      if (column?.renameable === true && onColumnRename) {
        onColumnRename(
          key,
          declaredNamesRef.current.get(key) ?? declaredColumnName(column)
        );
      }
    }
  }, [store, columns, commit, onColumnRename]);

  // Precompute every pinned column's inset once per layout change — adapters
  // call `pinOffset` per cell per render, so a lookup beats re-walking the
  // pinned set each time on wide tables.
  const pinInsets = useMemo(() => {
    const resolveWidth = (column: ColumnDef<TRow>): number => {
      const override = state.widths[column.key];
      if (typeof override === "number") return override;
      // Only pixel widths can be summed into a sticky inset; relative units
      // have no px value here, so fall back to a sane default instead.
      return parsePxWidth(column.width) ?? FALLBACK_PIN_WIDTH;
    };
    const insets = new Map<string, { side: PinSide; inset: number }>();
    for (const side of ["start", "end"] as const) {
      // Only VISIBLE pinned columns have a rendered cell to stick — a hidden
      // pinned key stays out of the map and reads back as unpinned.
      const samePinned = visibleColumns.filter(
        (c) => state.pinned[c.key] === side
      );
      // Start: sum widths before each column; end: sum widths after it.
      const ordered = side === "start" ? samePinned : [...samePinned].reverse();
      let inset = 0;
      for (const column of ordered) {
        insets.set(column.key, { side, inset });
        inset += resolveWidth(column);
      }
    }
    return insets;
  }, [state.pinned, state.widths, visibleColumns]);

  const pinOffset = useCallback(
    (key: string) => pinInsets.get(key),
    [pinInsets]
  );

  return {
    state,
    visibleColumns,
    isHidden,
    setHidden,
    toggleVisible,
    setPinned,
    move,
    setOrder,
    setWidth,
    setName,
    resetName,
    pinOffset,
    reset,
    toggleColumnGroup,
  };
}
