/**
 * Many rows changed, saved in one go.
 *
 * Row mode holds one row's fields until the reader saves it. Batch mode holds
 * *several rows* until they save all of them — the shape of a review pass, where
 * someone walks a list correcting values and wants one write at the end rather
 * than one per row. Nothing is sent until they say so, and one Cancel puts
 * everything back.
 *
 * The table still owns none of the data: what a save produces is the list of
 * patches, and the host applies them however it applies anything else. That is
 * also what makes the write atomic if the host wants it to be — a single request
 * with every change in it.
 */
import type { FeatureHostState } from "../features/currentHost";
import { type EditableColumnLike, readEditableCellValue } from "./cellEditing";
import {
  createEditCommitLifecycle,
  type EditCommitSnapshot,
  type EditCommitValidationOptions,
  validateEditCommit,
} from "./editCommitLifecycle";
import type { BatchRowEdit, EditEventHandler } from "./editContracts";
import { observeEdit } from "./editingController";
import { parseColumnDraft, type RowEditDrafts } from "./rowEditing";
import { listenerSet } from "./storePlumbing";

/**
 * One pending row, and what each changed field is measured against.
 *
 * @public
 */
export interface BatchEditEntry {
  /** The row's id. */
  readonly rowId: string;
  /**
   * The row as it read when the reader first changed it. Untyped because
   * the chrome hands the batch state around as `BatchEditingState<never>`,
   * and a row in an output position would stop it fitting there.
   */
  readonly openedRow: unknown;
  /** What each changed field read when the reader changed it. */
  readonly seeds: Readonly<Record<string, string>>;
  /** What each changed field reads now. */
  readonly drafts: Readonly<Record<string, string>>;
}

/**
 * Headless batch-editing state — what a binding hands its cells.
 *
 * @public
 */
export interface BatchEditingState<TRow> {
  /** Current validation or host-save state, absent while idle. */
  readonly commit?: EditCommitSnapshot;
  /** How many rows are waiting — what a "3 unsaved rows" line reads. */
  count: number;
  /** Whether anything is waiting at all. */
  pending: boolean;
  /** Whether this row has pending changes. */
  isPending: (rowId: string) => boolean;
  /** This cell's draft, or the row's stored value when it has none. */
  draftFor: (row: TRow, rowId: string, columnKey: string) => string;
  /** Whether this cell has been changed. */
  isChanged: (rowId: string, columnKey: string) => boolean;
  /** Change one cell, without telling the host. */
  setDraft: (
    row: TRow,
    rowId: string,
    columnKey: string,
    value: string
  ) => void;
  /** Request one atomic save; retain drafts until the host accepts it. */
  saveAll: () => void;
  /** Forget everything, restoring nothing — the drafts were never applied. */
  cancelAll: () => void;
  /** Forget one row's changes. */
  cancelRow: (rowId: string) => void;
  /** Every pending row, and what each changed field is measured against. */
  entries: readonly BatchEditEntry[];
  /**
   * Keep mine: these fields now read the incoming values, and the drafts
   * stand — so the patch still carries what the reader typed.
   */
  acceptSeeds: (
    row: TRow,
    rowId: string,
    columnKeys: readonly string[]
  ) => void;
  /**
   * Take theirs: these fields stop being changes at all, so the cells fall
   * back to what the row now reads.
   */
  takeSeeds: (row: TRow, rowId: string, columnKeys: readonly string[]) => void;
  /** A digest of the pending drafts, for a row memo comparator. */
  signature: string;
  /** The table that owns these editors — never a sibling's host. */
  featureHost?: FeatureHostState;
}

/**
 * What {@link createBatchEditStore} needs.
 *
 * @public
 */
export interface BatchEditStoreOptions<
  TRow,
> extends EditCommitValidationOptions<TRow> {
  /** Format a failed validation request or host save. */
  readonly formatEditError?: (error: unknown) => string;
  /** Observe a rejected host save. */
  readonly onEditError?: EditEventHandler<TRow>;
  /** Observe a validation verdict which refused a save. */
  readonly onValidationFail?: EditEventHandler<TRow>;
  /**
   * Whether batch editing is armed. Off by default: it changes when a commit
   * happens, which is a decision about the data rather than a preference.
   */
  readonly enabled?: boolean;
  /** The columns, for seeding drafts and parsing them back. */
  readonly columns: readonly EditableColumnLike<TRow>[];
  /**
   * Take every pending row at once. The table never writes to a row, and the
   * whole point of the mode is that this is called once.
   */
  readonly onBatchEdit?: (edits: readonly BatchRowEdit<TRow>[]) => unknown;
  /** A row became pending. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** Pending changes were thrown away. */
  readonly onEditCancel?: EditEventHandler<TRow>;
  /** The host received the batch. */
  readonly onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  readonly featureHost?: FeatureHostState;
}

/**
 * Every pending row's drafts, by row id.
 *
 * `seeds` is what each changed field read when the reader changed it — what an
 * incoming update is measured against, so a field they typed in can be told
 * apart from one they never touched.
 *
 * @public
 */
export type BatchPendingDrafts = Readonly<
  Record<string, { row: unknown; drafts: RowEditDrafts; seeds: RowEditDrafts }>
>;

/**
 * The pending batch, as a reader sees it.
 *
 * @public
 */
export interface BatchEditSnapshot {
  /** Current validation or host-save state, absent while idle. */
  readonly commit?: EditCommitSnapshot;
  /** Every pending row, by id. */
  readonly pending: BatchPendingDrafts;
  /** The same rows as a list, for the conflict reconciler. */
  readonly entries: readonly BatchEditEntry[];
  /** A digest of the pending drafts, for a row memo comparator. */
  readonly signature: string;
}

/**
 * The batch store.
 *
 * @public
 */
export interface BatchEditStore<TRow> {
  /** Revoke pending continuations; cannot cancel a request already sent to the host. */
  readonly dispose?: () => void;
  /** The batch now. */
  readonly getSnapshot: () => BatchEditSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: BatchEditStoreOptions<TRow>) => void;
  /** Change one cell; a no-op unless `enabled`. */
  readonly setDraft: (
    row: TRow,
    rowId: string,
    columnKey: string,
    value: string
  ) => void;
  /** Hand the host every pending row, clearing drafts only after success. */
  readonly saveAll: () => void;
  /** Forget everything. */
  readonly cancelAll: () => void;
  /** Forget one row's changes. */
  readonly cancelRow: (rowId: string) => void;
  /** Keep mine for these fields of one row. */
  readonly acceptSeeds: (
    row: TRow,
    rowId: string,
    columnKeys: readonly string[]
  ) => void;
  /** Take theirs for these fields of one row. */
  readonly takeSeeds: (
    row: TRow,
    rowId: string,
    columnKeys: readonly string[]
  ) => void;
}

/** The snapshot for a pending set. */
function batchSnapshot(pending: BatchPendingDrafts): BatchEditSnapshot {
  return {
    pending,
    entries: Object.entries(pending).map(([rowId, entry]) => ({
      rowId,
      openedRow: entry.row,
      seeds: entry.seeds,
      drafts: entry.drafts,
    })),
    signature: Object.entries(pending)
      .map(
        ([rowId, entry]) =>
          `${rowId}:${Object.entries(entry.drafts)
            .map(([key, value]) => `${key}=${value}`)
            .join("|")}`
      )
      .join(";"),
  };
}

/**
 * Create the batch store.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link BatchEditStoreOptions}.
 * @returns The store; inert unless `enabled`.
 *
 * @public
 */
export function createBatchEditStore<TRow>(
  options: BatchEditStoreOptions<TRow>
): BatchEditStore<TRow> {
  let current = options;
  let snapshot = batchSnapshot({});
  const { subscribe, notify } = listenerSet();
  let disposed = false;
  const commit = createEditCommitLifecycle((value) => {
    if (disposed) return;
    if (value === undefined) {
      const next = { ...snapshot };
      delete next.commit;
      snapshot = next;
    } else snapshot = { ...snapshot, commit: value };
    notify();
  });

  const write = (next: BatchPendingDrafts): void => {
    snapshot = {
      ...batchSnapshot(next),
      ...(snapshot.commit ? { commit: snapshot.commit } : {}),
    };
    notify();
  };

  const columnOf = (columnKey: string) =>
    current.columns.find((entry) => entry.key === columnKey);

  /** What an incoming row reads for these fields. */
  const incomingOf = (
    row: TRow,
    columnKeys: readonly string[]
  ): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const columnKey of columnKeys) {
      const column = columnOf(columnKey);
      if (!column) continue;
      values[columnKey] = readEditableCellValue(
        row,
        column,
        current.featureHost
      );
    }
    return values;
  };

  const cancelEvent = (rowId: string, entry: BatchPendingDrafts[string]) => {
    observeEdit(current.onEditCancel, {
      row: entry.row as TRow,
      rowId,
      columnKey: "",
      value: entry.drafts,
      previousValue: entry.row,
      unit: "batch",
    });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
    configure(next) {
      if (disposed) return;
      if (
        next.enabled !== current.enabled ||
        next.columns !== current.columns ||
        next.onBatchEdit !== current.onBatchEdit ||
        next.validateRow !== current.validateRow ||
        next.applyEdit !== current.applyEdit ||
        next.featureHost !== current.featureHost
      )
        commit.invalidate();
      current = next;
    },
    dispose() {
      if (disposed) return;
      commit.dispose();
      disposed = true;
    },
    setDraft(row, rowId, columnKey, value) {
      if (disposed || current.enabled !== true) return;
      const column = columnOf(columnKey);
      if (!column) return;
      const stored = readEditableCellValue(row, column, current.featureHost);
      const entry = snapshot.pending[rowId];
      if (commit.busy() && entry?.drafts[columnKey] === value) return;
      commit.invalidate();
      const drafts = { ...entry?.drafts, [columnKey]: value };
      const seeds = { ...entry?.seeds, [columnKey]: stored };
      // A value typed back to what it was is not a change, and a row left with
      // no changes is not pending — otherwise "3 unsaved rows" counts rows the
      // reader has already put back.
      if (value === stored) {
        delete drafts[columnKey];
        delete seeds[columnKey];
      }
      const wasPending = entry !== undefined;
      const next = { ...snapshot.pending };
      if (Object.keys(drafts).length === 0) delete next[rowId];
      else next[rowId] = { row: entry?.row ?? row, drafts, seeds };
      write(next);
      if (!wasPending && next[rowId]) {
        observeEdit(current.onEditStart, {
          row,
          rowId,
          columnKey,
          value,
          previousValue: stored,
          unit: "batch",
        });
      }
    },
    saveAll() {
      if (disposed || current.enabled !== true || commit.busy()) return;
      const edits: BatchRowEdit<TRow>[] = [];
      for (const [rowId, entry] of Object.entries(snapshot.pending)) {
        const row = entry.row as TRow;
        const patch: Record<string, unknown> = {};
        for (const [columnKey, draft] of Object.entries(entry.drafts)) {
          const column = columnOf(columnKey);
          if (!column) continue;
          patch[columnKey] = parseColumnDraft(
            column,
            draft,
            row,
            current.featureHost
          );
        }
        edits.push({ row, rowId, patch });
      }
      if (edits.length === 0) {
        write({});
        return;
      }
      const validate =
        current.validateRow !== undefined ||
        current.columns.some(
          (column) =>
            column.validate && edits.some((edit) => column.key in edit.patch)
        );
      const events = edits.map((edit) => ({
        row: edit.row,
        rowId: edit.rowId,
        columnKey: "",
        value: edit.patch,
        previousValue: edit.row,
        unit: "batch" as const,
      }));
      commit.run({
        validate: validate
          ? (active) => validateEditCommit(edits, current, active)
          : undefined,
        commit: () => current.onBatchEdit?.(edits),
        committed: () => {
          for (const event of events) observeEdit(current.onEditCommit, event);
        },
        success: () => write({}),
        failure: (error) => {
          for (const event of events)
            observeEdit(current.onEditError, { ...event, error });
        },
        invalid: (failures) => {
          for (const failure of failures) {
            const event = events.find((item) => item.rowId === failure.rowId);
            if (event)
              observeEdit(current.onValidationFail, {
                ...event,
                columnKey: failure.columnKey ?? "",
                error: failure.message,
              });
          }
        },
        formatError: current.formatEditError,
      });
    },
    cancelAll() {
      if (disposed) return;
      commit.invalidate();
      for (const [rowId, entry] of Object.entries(snapshot.pending)) {
        cancelEvent(rowId, entry);
      }
      write({});
    },
    cancelRow(rowId) {
      if (disposed) return;
      const entry = snapshot.pending[rowId];
      if (!entry) return;
      commit.invalidate();
      cancelEvent(rowId, entry);
      const next = { ...snapshot.pending };
      delete next[rowId];
      write(next);
    },
    acceptSeeds(row, rowId, columnKeys) {
      if (disposed) return;
      const entry = snapshot.pending[rowId];
      if (!entry) return;
      commit.invalidate();
      write({
        ...snapshot.pending,
        [rowId]: {
          ...entry,
          row,
          seeds: { ...entry.seeds, ...incomingOf(row, columnKeys) },
        },
      });
    },
    takeSeeds(row, rowId, columnKeys) {
      if (disposed) return;
      const entry = snapshot.pending[rowId];
      if (!entry) return;
      commit.invalidate();
      // Taking what arrived leaves nothing changed in that cell, so the draft
      // goes: an untouched cell reads the row itself.
      const drafts = { ...entry.drafts };
      const seeds = { ...entry.seeds };
      for (const columnKey of columnKeys) {
        delete drafts[columnKey];
        delete seeds[columnKey];
      }
      const next = { ...snapshot.pending };
      if (Object.keys(drafts).length === 0) delete next[rowId];
      else next[rowId] = { row, drafts, seeds };
      write(next);
    },
  };
}

/**
 * The state a binding hands its cells, read off one snapshot.
 *
 * @param store - The store the actions go to.
 * @param snapshot - The batch to read.
 * @param options - The columns and host the drafts are read against.
 * @returns The batch state.
 *
 * @public
 */
export function batchEditingView<TRow>(
  store: BatchEditStore<TRow>,
  snapshot: BatchEditSnapshot,
  options: Pick<BatchEditStoreOptions<TRow>, "columns" | "featureHost">
): BatchEditingState<TRow> {
  const { pending } = snapshot;
  const count = Object.keys(pending).length;
  return {
    count,
    commit: snapshot.commit,
    pending: count > 0,
    isPending: (rowId) => rowId in pending,
    isChanged: (rowId, columnKey) =>
      pending[rowId]?.drafts[columnKey] !== undefined,
    draftFor: (row, rowId, columnKey) => {
      const draft = pending[rowId]?.drafts[columnKey];
      if (draft !== undefined) return draft;
      const column = options.columns.find((entry) => entry.key === columnKey);
      return column
        ? readEditableCellValue(row, column, options.featureHost)
        : "";
    },
    setDraft: store.setDraft,
    saveAll: store.saveAll,
    cancelAll: store.cancelAll,
    cancelRow: store.cancelRow,
    entries: snapshot.entries,
    acceptSeeds: store.acceptSeeds,
    takeSeeds: store.takeSeeds,
    signature: snapshot.signature,
    featureHost: options.featureHost,
  };
}
