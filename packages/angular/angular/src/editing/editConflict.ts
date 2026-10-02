/**
 * Live edit conflicts for Angular: core's reconciler and question as signals.
 */
import {
  type BatchEditingState,
  type CellEditingState,
  createEditConflictStore,
  type EditableColumnLike,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditConflictState,
  editConflictView,
  type RowEditingState,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import {
  fromStore,
  type FromStoreOptions,
  type MaybeSignal,
  readMaybe,
} from "../store";

export type {
  EditConflict,
  EditConflictChange,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
  EditConflictState,
  ReconcileLiveBatchEdit,
  ReconcileLiveEdit,
  ReconcileLiveRowEdit,
} from "@adapttable/core";

/**
 * Subscribe to core's conflict store until the injection context is destroyed.
 * Reconciliation is explicit; use {@link injectLiveEditConflict} to wire live
 * rows and editing sessions automatically.
 *
 * @public
 */
export function injectEditConflict<TRow>(
  options: FromStoreOptions = {}
): Signal<EditConflictState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectEditConflict);
  const injector = options.injector ?? inject(Injector);
  const store = createEditConflictStore<TRow>();
  const snapshot = fromStore(store, { injector });
  return computed(() => editConflictView(store, snapshot()));
}

/**
 * The live rows and host policy used to reconcile an open editing session.
 *
 * @public
 */
export interface LiveEditConflictInput<TRow> {
  /** Source rows, or the grouping's data-row leaves; never group headers. */
  readonly rows: readonly TRow[];
  /** All columns, including editable columns outside the current viewport. */
  readonly columns: readonly EditableColumnLike<TRow>[];
  /** Host row identity. */
  readonly rowKey: (row: TRow) => string;
  /** Optional whole-row version check for a single-cell editor. */
  readonly rowVersion?: (row: TRow) => string | number;
  /** Defaults to asking before giving up a draft. */
  readonly editConflictPolicy?: EditConflictPolicy;
  /** A host choice takes precedence over the default policy. */
  readonly onEditConflict?: EditConflictHandler<TRow>;
}

/**
 * Sessions and reactive source inputs for {@link injectLiveEditConflict}.
 *
 * @public
 */
export interface LiveEditConflictOptions<TRow> extends FromStoreOptions {
  /** Read rows, columns and policy reactively as the table changes. */
  readonly input: MaybeSignal<LiveEditConflictInput<TRow>>;
  /** The table's cell session, including its core-owned cancel lifecycle. */
  readonly cell: Signal<CellEditingState>;
  /** Supply only when row editing is armed. */
  readonly row?: Signal<RowEditingState<TRow>>;
  /** Supply only when batch editing is armed. */
  readonly batch?: Signal<BatchEditingState<TRow>>;
}

/**
 * Reconcile live rows with open cell, row and batch sessions. Core owns the
 * comparisons, policy, incoming values and resolutions; Angular only reads
 * reactive inputs and schedules each reconciliation. Session cancellation
 * clears its question on the next effect pass. A missing cell row is discarded
 * by the cell session without committing or emitting a user-cancel event.
 *
 * @public
 */
export function injectLiveEditConflict<TRow>(
  options: LiveEditConflictOptions<TRow>
): Signal<EditConflictState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectLiveEditConflict);
  const injector = options.injector ?? inject(Injector);
  const conflict = injectEditConflict<TRow>({ injector });
  effect(
    () => {
      const input = readMaybe(options.input);
      const cell = options.cell();
      untracked(() => {
        cell.discardIfRowMissing(input.rows, (item) =>
          input.rowKey(item as TRow)
        );
        const current = options.cell();
        conflict().reconcile({
          ...input,
          policy: input.editConflictPolicy ?? "ask",
          active: current.active,
          openedRow: current.openedRow() as TRow | undefined,
          draft: current.draft,
          keep: current.keepLive,
          take: current.takeLive,
        });
      });
    },
    { injector }
  );
  const row = options.row;
  if (row) {
    effect(
      () => {
        const input = readMaybe(options.input);
        const current = row();
        untracked(() => {
          conflict().reconcileRow({
            ...input,
            policy: input.editConflictPolicy ?? "ask",
            activeRowId: current.activeRowId,
            openedRow: current.openedRow(),
            seeds: current.seeds(),
            drafts: current.drafts,
            accept: current.acceptSeeds,
            take: current.takeSeeds,
          });
        });
      },
      { injector }
    );
  }
  const batch = options.batch;
  if (batch) {
    effect(
      () => {
        const input = readMaybe(options.input);
        const current = batch();
        untracked(() => {
          conflict().reconcileBatch({
            ...input,
            policy: input.editConflictPolicy ?? "ask",
            entries: current.entries,
            accept: current.acceptSeeds,
            take: current.takeSeeds,
          });
        });
      },
      { injector }
    );
  }
  return conflict;
}
