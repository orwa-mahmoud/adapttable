/**
 * In-place cell, row and batch editing for Angular: core's sessions as
 * signals.
 */
import {
  type BatchEditingState,
  batchEditingView,
  type BatchRowEdit,
  type CellEditingState,
  cellEditingView,
  createBatchEditStore,
  createCellEditSession,
  createRowEditStore,
  type EditableColumnLike,
  type EditEventHandler,
  type FeatureHostState,
  type RowEditingState,
  rowEditingView,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore, type MaybeSignal, readMaybe } from "../store";

export type {
  BatchEditingState,
  BatchRowEdit,
  CellEditingState,
  RowEditingState,
};

/**
 * A cell-edit write the host applies.
 *
 * @public
 */
export type CellEditHandler<TRow> = (
  row: TRow,
  columnKey: string,
  value: unknown
) => void | Promise<void>;

/**
 * A row-edit write the host applies — one patch for every changed field.
 *
 * @public
 */
export type RowEditHandler<TRow> = (
  row: TRow,
  patch: Readonly<Record<string, unknown>>
) => void | Promise<void>;

/**
 * A batch-edit write the host applies — every pending row at once.
 *
 * @public
 */
export type BatchEditHandler<TRow> = (
  edits: readonly BatchRowEdit<TRow>[]
) => void | Promise<void>;

/**
 * Lifecycle observers for {@link injectCellEditing}.
 *
 * @public
 */
export interface CellEditingOptions<TRow = unknown> {
  /** An editor opened. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the draft away (Escape, or switching cells). */
  readonly onEditCancel?: EditEventHandler<TRow>;
  /**
   * A commit reached the host. Carried for {@link editing} extras parity;
   * the session itself does not fire it — {@link editableCellController} does
   * through the editing bundle's lifecycle.
   */
  readonly onEditCommit?: EditEventHandler<TRow>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * Options for {@link injectRowEditing}.
 *
 * @public
 */
export interface RowEditingInjectOptions<TRow> {
  /** Whether row editing is armed. */
  readonly enabled?: MaybeSignal<boolean>;
  /** The columns, for seeding drafts and parsing them back. */
  readonly columns: MaybeSignal<readonly EditableColumnLike<TRow>[]>;
  /** The host's write for a committed row. */
  readonly onRowEdit?: RowEditHandler<TRow>;
  /** An editor opened on this row. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the drafts away. */
  readonly onEditCancel?: EditEventHandler<TRow>;
  /** The host received the patch. */
  readonly onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  readonly featureHost?: FeatureHostState;
  /** The injector to run in. */
  readonly injector?: Injector;
}

/**
 * Options for {@link injectBatchEditing}.
 *
 * @public
 */
export interface BatchEditingInjectOptions<TRow> {
  /** Whether batch editing is armed. */
  readonly enabled?: MaybeSignal<boolean>;
  /** The columns, for seeding drafts and parsing them back. */
  readonly columns: MaybeSignal<readonly EditableColumnLike<TRow>[]>;
  /** The host's write for every pending row at once. */
  readonly onBatchEdit?: BatchEditHandler<TRow>;
  /** A row became pending. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** The reader threw a pending row away. */
  readonly onEditCancel?: EditEventHandler<TRow>;
  /** The host received the batch. */
  readonly onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  readonly featureHost?: FeatureHostState;
  /** The injector to run in. */
  readonly injector?: Injector;
}

/**
 * Headless editing state machine: one active cell, draft value, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * @param options - Optional start/cancel observers.
 * @returns The state machine as a signal.
 *
 * @public
 */
export function injectCellEditing<TRow = unknown>(
  options: CellEditingOptions<TRow> = {}
): Signal<CellEditingState> {
  if (!options.injector) assertInInjectionContext(injectCellEditing);
  const injector = options.injector ?? inject(Injector);
  const session = createCellEditSession<TRow>({
    onEditStart: options.onEditStart,
    onEditCancel: options.onEditCancel,
  });
  effect(
    () => {
      session.configure({
        onEditStart: options.onEditStart,
        onEditCancel: options.onEditCancel,
      });
    },
    { injector }
  );
  const snapshot = fromStore(session, { injector });
  return computed(() => cellEditingView(session, snapshot()));
}

/**
 * Headless state for editing a row as one unit.
 *
 * @param options - See {@link RowEditingInjectOptions}.
 * @returns The state as a signal.
 *
 * @public
 */
export function injectRowEditing<TRow>(
  options: RowEditingInjectOptions<TRow>
): Signal<RowEditingState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectRowEditing);
  const injector = options.injector ?? inject(Injector);
  const store = createRowEditStore<TRow>({
    enabled: readMaybe(options.enabled) ?? false,
    columns: readMaybe(options.columns),
    onRowEdit: options.onRowEdit,
    onEditStart: options.onEditStart,
    onEditCancel: options.onEditCancel,
    onEditCommit: options.onEditCommit,
    featureHost: options.featureHost,
  });
  effect(
    () => {
      store.configure({
        enabled: readMaybe(options.enabled) ?? false,
        columns: readMaybe(options.columns),
        onRowEdit: options.onRowEdit,
        onEditStart: options.onEditStart,
        onEditCancel: options.onEditCancel,
        onEditCommit: options.onEditCommit,
        featureHost: options.featureHost,
      });
    },
    { injector }
  );
  const snapshot = fromStore(store, { injector });
  return computed(() => rowEditingView(store, snapshot(), options.featureHost));
}

/**
 * Headless state for many pending row edits saved in one go.
 *
 * @param options - See {@link BatchEditingInjectOptions}.
 * @returns The state as a signal.
 *
 * @public
 */
export function injectBatchEditing<TRow>(
  options: BatchEditingInjectOptions<TRow>
): Signal<BatchEditingState<TRow>> {
  if (!options.injector) assertInInjectionContext(injectBatchEditing);
  const injector = options.injector ?? inject(Injector);
  const store = createBatchEditStore<TRow>({
    enabled: readMaybe(options.enabled) ?? false,
    columns: readMaybe(options.columns),
    onBatchEdit: options.onBatchEdit,
    onEditStart: options.onEditStart,
    onEditCancel: options.onEditCancel,
    onEditCommit: options.onEditCommit,
    featureHost: options.featureHost,
  });
  effect(
    () => {
      store.configure({
        enabled: readMaybe(options.enabled) ?? false,
        columns: readMaybe(options.columns),
        onBatchEdit: options.onBatchEdit,
        onEditStart: options.onEditStart,
        onEditCancel: options.onEditCancel,
        onEditCommit: options.onEditCommit,
        featureHost: options.featureHost,
      });
    },
    { injector }
  );
  const snapshot = fromStore(store, { injector });
  return computed(() =>
    batchEditingView(store, snapshot(), {
      columns: readMaybe(options.columns),
      featureHost: options.featureHost,
    })
  );
}
