/**
 * The column-layout controller: every rule behind hiding, ordering, pinning,
 * resizing and renaming columns, held once for any binding.
 *
 * The layout itself lives in a {@link ControllableStore}, so the host can
 * control it or leave it to the table. What the store alone cannot know is
 * the rename bookkeeping: a host commonly writes an accepted name back into
 * its column declarations, and a reset must then restore the name declared
 * BEFORE the rename rather than that echo. The controller remembers those
 * baselines between renders; {@link ColumnLayoutController.configure} hands
 * it the current columns each time.
 */

import type { ColumnMetadata } from "../contracts/columns";
import {
  type ControllableStore,
  type ControllableStoreOptions,
  createControllableStore,
} from "../state/controllableStore";
import {
  initialColumnLayout,
  withColumnHidden,
  withColumnMoved,
  withColumnOrder,
  withColumnPinned,
  withColumnWidth,
} from "../state/tableStores";
import {
  applyColumnOrder,
  type ColumnLayoutState,
  EMPTY_COLUMN_LAYOUT,
  type PinOffset,
  type PinSide,
} from "./columnLayoutModel";
import { applyColumnNames, declaredColumnName } from "./columnNames";
import {
  applyCollapsedColumnGroups,
  type ColumnGroupRecord,
  marriedOrderHolds,
} from "./columnTree";
import { FALLBACK_PIN_WIDTH, parsePxWidth } from "./columnWidths";
import { toggleCollapsedColumnGroup } from "./headerGroups";

/**
 * The layout store reports every change and reads its own commits, so two
 * mutations in one event compose instead of the second overwriting the first.
 *
 * @public
 */
export const COLUMN_LAYOUT_STORE_OPTIONS: ControllableStoreOptions<ColumnLayoutState> =
  {
    observeUncontrolled: true,
    readsOwnCommits: true,
  };

/**
 * What a column-layout controller is configured with, each render.
 *
 * @typeParam TRow - The row type.
 * @typeParam TColumn - The binding's column type.
 *
 * @public
 */
export interface ColumnLayoutControllerOptions<
  TRow,
  TColumn extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
> {
  /** All declared columns (already filtered for the current device layout). */
  readonly columns: readonly TColumn[];
  /** Persists a user rename in the host's domain model. Omit and renames are off. */
  readonly onColumnRename?: (key: string, name: string) => void;
  /** When true, collapsed column groups hide their leaves. */
  readonly collapsibleColumnGroups?: boolean;
  /** Tree-group collapse and marry options, by group id. */
  readonly columnGroups?: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
}

/**
 * The column-layout controller.
 *
 * @typeParam TRow - The row type.
 * @typeParam TColumn - The binding's column type.
 *
 * @public
 */
export interface ColumnLayoutController<
  TRow,
  TColumn extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
> {
  /** The layout store: hand it the host's value and read it to render. */
  readonly store: ControllableStore<ColumnLayoutState>;
  /**
   * Hand over this render's columns and callbacks, and bring the rename
   * baselines up to date with the layout's names.
   */
  readonly configure: (
    options: ColumnLayoutControllerOptions<TRow, TColumn>
  ) => void;
  /** Show or hide a column. */
  readonly setHidden: (key: string, hidden: boolean) => void;
  /** Toggle a column's visibility. */
  readonly toggleVisible: (key: string) => void;
  /** Pin a column to an edge, or unpin it with `undefined`. */
  readonly setPinned: (key: string, side: PinSide | undefined) => void;
  /** Set or clear a column's pixel width. */
  readonly setWidth: (key: string, width: number | undefined) => void;
  /** Rename a renameable column; the declared name clears the override. */
  readonly setName: (key: string, name: string) => void;
  /** Restore a renamed column's declared name. */
  readonly resetName: (key: string) => void;
  /** Collapse or expand a column group. No-op unless collapse is armed. */
  readonly toggleColumnGroup: (id: string) => void;
  /** Move a column to an index of the full order, hidden columns included. */
  readonly move: (key: string, toIndex: number) => void;
  /** Replace the full order; ignored unless it is a permutation that holds. */
  readonly setOrder: (order: readonly string[]) => void;
  /** Restore the empty layout, and every renamed column's declared name. */
  readonly reset: () => void;
}

/** The rename bookkeeping the controller keeps between renders. */
interface RenameBaselines {
  /** The name each column was declared with before its rename. */
  readonly declared: Map<string, string>;
  /** Columns whose override is live. */
  readonly renamed: Set<string>;
  /** The last override of a reset column, while the host may still echo it. */
  readonly staleEchoes: Map<string, string>;
}

function rememberDeclaredName(
  baselines: RenameBaselines,
  key: string,
  declared: string,
  staleEcho: string | undefined
): void {
  if (baselines.renamed.has(key)) return;
  if (staleEcho === undefined || declared !== staleEcho) {
    baselines.declared.set(key, declared);
  }
  baselines.renamed.add(key);
}

function reconcileStaleEcho(
  baselines: RenameBaselines,
  key: string,
  declared: string,
  staleEcho: string
): void {
  if (declared === staleEcho) return;
  baselines.staleEchoes.delete(key);
  baselines.renamed.delete(key);
  baselines.declared.set(key, declared);
}

function dropMissingRenameKeys(
  baselines: RenameBaselines,
  liveKeys: ReadonlySet<string>
): void {
  const tracked = new Set([
    ...baselines.declared.keys(),
    ...baselines.renamed,
    ...baselines.staleEchoes.keys(),
  ]);
  for (const key of tracked) {
    if (liveKeys.has(key)) continue;
    baselines.declared.delete(key);
    baselines.renamed.delete(key);
    baselines.staleEchoes.delete(key);
  }
}

/**
 * Keep the declaration that preceded an active rename as the reset target,
 * then resume tracking the live header once that override ends and the host
 * is no longer echoing the discarded name.
 */
function syncRenameBaselines<TRow>(
  baselines: RenameBaselines,
  columns: readonly ColumnMetadata<TRow>[],
  names: Readonly<Record<string, string>> | undefined
): void {
  const liveKeys = new Set<string>();
  for (const column of columns) {
    liveKeys.add(column.key);
    const declared = declaredColumnName(column);
    const override = names?.[column.key];
    const staleEcho = baselines.staleEchoes.get(column.key);

    if (override !== undefined) {
      rememberDeclaredName(baselines, column.key, declared, staleEcho);
      baselines.staleEchoes.delete(column.key);
      continue;
    }

    if (staleEcho !== undefined) {
      reconcileStaleEcho(baselines, column.key, declared, staleEcho);
      continue;
    }

    // Host dropped the override through controlled `layout.names` without
    // calling resetName. Resume the live declaration so a later rename
    // or reset does not restore the discarded label.
    baselines.renamed.delete(column.key);
    baselines.declared.set(column.key, declared);
  }

  dropMissingRenameKeys(baselines, liveKeys);
}

function endRenameOverride(
  baselines: RenameBaselines,
  key: string,
  lastOverride: string | undefined
): void {
  baselines.renamed.delete(key);
  if (lastOverride !== undefined) baselines.staleEchoes.set(key, lastOverride);
}

/** `names` without `key`, or `undefined` once none are left. */
function namesWithout(
  names: Readonly<Record<string, string>> | undefined,
  key: string
): Readonly<Record<string, string>> | undefined {
  const next = { ...names };
  delete next[key];
  return Object.keys(next).length > 0 ? next : undefined;
}

/**
 * Create a column-layout controller.
 *
 * @param defaultColumnLayout - The uncontrolled layout to start from.
 * @returns The controller; call {@link ColumnLayoutController.configure}
 *   before the first mutation.
 *
 * @public
 */
export function createColumnLayoutController<
  TRow,
  TColumn extends ColumnMetadata<TRow> = ColumnMetadata<TRow>,
>(
  defaultColumnLayout?: Partial<ColumnLayoutState>
): ColumnLayoutController<TRow, TColumn> {
  const store = createControllableStore(
    initialColumnLayout(defaultColumnLayout),
    COLUMN_LAYOUT_STORE_OPTIONS
  );
  const baselines: RenameBaselines = {
    declared: new Map(),
    renamed: new Set(),
    staleEchoes: new Map(),
  };
  let options: ColumnLayoutControllerOptions<TRow, TColumn> = { columns: [] };

  const columnOf = (key: string): TColumn | undefined =>
    options.columns.find((candidate) => candidate.key === key);
  const declaredNameOf = (key: string, column: TColumn): string =>
    baselines.declared.get(key) ?? declaredColumnName(column);
  const fullOrder = (layout: ColumnLayoutState): string[] =>
    applyColumnOrder(options.columns, layout.order).map((c) => c.key);
  const orderHolds = (order: readonly string[]): boolean =>
    !options.columnGroups || marriedOrderHolds(order, options.columnGroups);

  const setHidden = (key: string, hidden: boolean): void => {
    const current = store.current();
    const next = withColumnHidden(current, key, hidden);
    if (next !== current) store.commit(next);
  };

  return {
    store,
    configure(next) {
      options = next;
      syncRenameBaselines(baselines, next.columns, store.getSnapshot().names);
    },
    setHidden,
    toggleVisible: (key) =>
      setHidden(key, !store.current().hidden.includes(key)),
    setPinned: (key, side) =>
      store.commit(withColumnPinned(store.current(), key, side)),
    setWidth: (key, width) =>
      store.commit(withColumnWidth(store.current(), key, width)),
    setName(key, nextName) {
      const column = columnOf(key);
      const { onColumnRename } = options;
      if (column?.renameable !== true || !onColumnRename) return;
      const name = nextName.trim();
      if (name === "") return;
      const current = store.current();
      const declared = declaredNameOf(key, column);
      if ((current.names?.[key] ?? declared) === name) return;
      let names: Readonly<Record<string, string>> | undefined;
      if (name === declared) {
        endRenameOverride(baselines, key, current.names?.[key]);
        names = namesWithout(current.names, key);
      } else {
        baselines.renamed.add(key);
        names = { ...current.names, [key]: name };
      }
      store.commit({ ...current, names });
      onColumnRename(key, name);
    },
    resetName(key) {
      const column = columnOf(key);
      const { onColumnRename } = options;
      const current = store.current();
      const lastOverride = current.names?.[key];
      if (
        column?.renameable !== true ||
        !onColumnRename ||
        lastOverride === undefined
      ) {
        return;
      }
      endRenameOverride(baselines, key, lastOverride);
      store.commit({ ...current, names: namesWithout(current.names, key) });
      onColumnRename(key, declaredNameOf(key, column));
    },
    toggleColumnGroup(id) {
      if (options.collapsibleColumnGroups !== true) return;
      const current = store.current();
      const nextIds = toggleCollapsedColumnGroup(
        current.collapsedGroups ?? [],
        id
      );
      store.commit({
        ...current,
        collapsedGroups: nextIds.length > 0 ? nextIds : undefined,
      });
    },
    move(key, toIndex) {
      const latest = store.current();
      const next = withColumnMoved(
        latest,
        fullOrder(latest),
        key,
        toIndex,
        orderHolds
      );
      if (next) store.commit(next);
    },
    setOrder(order) {
      const latest = store.current();
      const next = withColumnOrder(
        latest,
        fullOrder(latest),
        order,
        orderHolds
      );
      if (next) store.commit(next);
    },
    reset() {
      const names = store.current().names ?? {};
      const renamedKeys = Object.keys(names);
      for (const key of renamedKeys) {
        endRenameOverride(baselines, key, names[key]);
      }
      store.commit(EMPTY_COLUMN_LAYOUT);
      const { onColumnRename } = options;
      for (const key of renamedKeys) {
        const column = columnOf(key);
        if (column?.renameable === true && onColumnRename) {
          onColumnRename(key, declaredNameOf(key, column));
        }
      }
    },
  };
}

/**
 * The columns a layout renders: renamed, reordered, hidden ones dropped and,
 * when collapse is armed, the leaves of collapsed groups dropped too.
 *
 * @param columns - The declared columns.
 * @param state - The layout.
 * @param options - Group collapse, when armed.
 * @returns The visible columns, in render order.
 *
 * @public
 */
export function columnLayoutVisibleColumns<
  TColumn extends ColumnMetadata<never>,
>(
  columns: readonly TColumn[],
  state: Pick<
    ColumnLayoutState,
    "names" | "order" | "hidden" | "collapsedGroups"
  >,
  options: Pick<
    ColumnLayoutControllerOptions<never>,
    "collapsibleColumnGroups" | "columnGroups"
  > = {}
): TColumn[] {
  const named = applyColumnNames(columns, state.names);
  const ordered = (applyColumnOrder(named, state.order) as TColumn[]).filter(
    (c) => !state.hidden.includes(c.key)
  );
  if (options.collapsibleColumnGroups !== true) return ordered;
  return applyCollapsedColumnGroups(
    ordered,
    state.collapsedGroups ?? [],
    options.columnGroups
  ) as TColumn[];
}

/**
 * Every visible pinned column's sticky inset, computed once per layout —
 * bindings look one up per cell per render, so a map beats re-walking the
 * pinned set on wide tables. A hidden pinned column has no entry and reads
 * back as unpinned.
 *
 * @param visibleColumns - The columns rendered, in order.
 * @param state - The layout (its pins and width overrides).
 * @returns Each pinned column's side and inset, by key.
 *
 * @public
 */
export function columnPinInsets(
  visibleColumns: readonly ColumnMetadata<never>[],
  state: Pick<ColumnLayoutState, "pinned" | "widths">
): ReadonlyMap<string, PinOffset> {
  const resolveWidth = (column: ColumnMetadata<never>): number => {
    const override = state.widths[column.key];
    if (typeof override === "number") return override;
    // Only pixel widths can be summed into a sticky inset; relative units
    // have no px value here, so fall back to a sane default instead.
    return parsePxWidth(column.width) ?? FALLBACK_PIN_WIDTH;
  };
  const insets = new Map<string, PinOffset>();
  for (const side of ["start", "end"] as const) {
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
}
