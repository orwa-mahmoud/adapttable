/**
 * Editing a whole row at once.
 *
 * Cell editing commits each field as the reader leaves it, which is right for a
 * spreadsheet and wrong for a form: a row whose fields constrain each other
 * cannot be edited one cell at a time without passing through states that are
 * invalid on the way — a start date after an end date it is about to replace.
 *
 * So a row edit holds every field's draft until the reader saves, then hands the
 * host ONE patch. Cancel throws all of it away. The unit changes; nothing else
 * does — the same editors, the same validators, the same save states.
 */
import type { FeatureHostState } from "../features/currentHost";
import {
  type EditableColumnLike,
  parseCellEditValue,
  readEditableCellValue,
  resolveCellEditor,
} from "./cellEditing";
import {
  createEditCommitLifecycle,
  type EditCommitSnapshot,
  type EditCommitValidationOptions,
  validateEditCommit,
} from "./editCommitLifecycle";
import type { EditEventHandler } from "./editContracts";
import { observeEdit } from "./editingController";
import { listenerSet } from "./storePlumbing";

/**
 * The drafts a row edit holds, by column key.
 *
 * @public
 */
export type RowEditDrafts = Readonly<Record<string, string>>;

/**
 * Headless row-editing state — what a binding hands its cells.
 *
 * @public
 */
export interface RowEditingState<TRow> {
  /** Current validation or host-save state, absent while idle. */
  readonly commit?: EditCommitSnapshot;
  /** The row being edited, or `null` when none is. */
  activeRowId: string | null;
  /** Whether this row is the one being edited. */
  isEditing: (rowId: string) => boolean;
  /** Every draft in the open row, by column key. */
  drafts: RowEditDrafts;
  /** One column's draft in the open row. */
  draftFor: (columnKey: string) => string;
  /** Open a row, seeding every editable column from its current value. */
  begin: (row: TRow, rowId: string) => void;
  /** Replace one column's draft. */
  setDraft: (columnKey: string, value: string) => void;
  /**
   * Hand the host everything the reader changed as one patch. Close after a
   * successful save; pending and rejected saves keep the drafts.
   * A no-op when nothing is open, and it reports nothing when nothing changed —
   * saving an untouched row is a write the host never asked for.
   */
  save: () => void;
  /** Throw every draft away and close. */
  cancel: () => void;
  /** Whether any draft differs from the row's stored value. */
  isDirty: boolean;
  /** A digest of the open row's drafts, for a row memo comparator. */
  signature: string;
  /** The row the form opened against, or `undefined` when none is open. */
  openedRow: () => TRow | undefined;
  /**
   * What each field read when the form opened, or last accepted. This — not
   * the row — is what an incoming change is measured against, field by field.
   */
  seeds: () => RowEditDrafts | undefined;
  /**
   * Accept an incoming row's values for these fields as what they now read,
   * leaving the drafts alone: the reader keeps what they typed, and the patch
   * still carries it.
   */
  acceptSeeds: (row: TRow, columnKeys: readonly string[]) => void;
  /**
   * Take an incoming row's values for these fields, into both the drafts and
   * what they are measured against — nothing of the reader's is lost, because
   * these are fields they had not typed in, or chose to give up.
   */
  takeSeeds: (row: TRow, columnKeys: readonly string[]) => void;
  /** The table that owns these editors — never a sibling's host. */
  featureHost?: FeatureHostState;
}

/**
 * What {@link createRowEditStore} needs.
 *
 * @public
 */
export interface RowEditStoreOptions<
  TRow,
> extends EditCommitValidationOptions<TRow> {
  /** Format a failed validation request or host save. */
  readonly formatEditError?: (error: unknown) => string;
  /** Observe a rejected host save. */
  readonly onEditError?: EditEventHandler<TRow>;
  /** Observe a validation verdict which refused a save. */
  readonly onValidationFail?: EditEventHandler<TRow>;
  /**
   * Whether row editing is armed. Off by default: it changes the commit unit,
   * which is a decision about the data, not a preference.
   */
  readonly enabled?: boolean;
  /** The columns, for seeding drafts and parsing them back. */
  readonly columns: readonly EditableColumnLike<TRow>[];
  /**
   * Take everything the reader changed, as one patch of parsed values keyed by
   * column. The table never writes to a row.
   */
  readonly onRowEdit?: (
    row: TRow,
    patch: Readonly<Record<string, unknown>>
  ) => unknown;
  /** An editor opened on this row. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the drafts away. */
  readonly onEditCancel?: EditEventHandler<TRow>;
  /** The host received the patch. */
  readonly onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  readonly featureHost?: FeatureHostState;
}

/**
 * The open form, as a reader sees it.
 *
 * @public
 */
export interface RowEditSnapshot {
  /** Current validation or host-save state, absent while idle. */
  readonly commit?: EditCommitSnapshot;
  /** The row being edited, or `null`. */
  readonly activeRowId: string | null;
  /** Every draft in the open row, by column key. */
  readonly drafts: RowEditDrafts;
  /**
   * Whether any draft differs from what its field read when the form opened.
   * Measured when the drafts move, so accepting an incoming value into a
   * field's seed alone leaves it as it was.
   */
  readonly isDirty: boolean;
}

/**
 * The row-form store.
 *
 * @public
 */
export interface RowEditStore<TRow> {
  /** Revoke pending continuations; cannot cancel a request already sent to the host. */
  readonly dispose?: () => void;
  /** The form now. */
  readonly getSnapshot: () => RowEditSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: RowEditStoreOptions<TRow>) => void;
  /** Open a row; a no-op unless `enabled`. */
  readonly begin: (row: TRow, rowId: string) => void;
  /** Replace one column's draft. */
  readonly setDraft: (columnKey: string, value: string) => void;
  /** Request a save; close on success and retain drafts after an async failure. */
  readonly save: () => void;
  /** Throw every draft away and close. */
  readonly cancel: () => void;
  /** The row the form opened against. */
  readonly openedRow: () => TRow | undefined;
  /** What each field is measured against. */
  readonly seeds: () => RowEditDrafts | undefined;
  /** Keep mine: these fields' seeds take the incoming values. */
  readonly acceptSeeds: (row: TRow, columnKeys: readonly string[]) => void;
  /** Take theirs: these fields' seeds and drafts take the incoming values. */
  readonly takeSeeds: (row: TRow, columnKeys: readonly string[]) => void;
}

/** Every column a reader may edit on a given row. */
function editableColumns<TRow>(
  columns: readonly EditableColumnLike<TRow>[],
  row: TRow
): EditableColumnLike<TRow>[] {
  return columns.filter((column) => {
    const { editable } = column;
    if (editable === undefined || editable === false) return false;
    return editable === true || editable(row);
  });
}

/**
 * A draft parsed back into the stored value's type: the column's own
 * `parseValue`, else its editor's parse.
 *
 * @public
 */
export function parseColumnDraft<TRow>(
  column: EditableColumnLike<TRow>,
  draft: string,
  row: TRow,
  featureHost?: FeatureHostState
): unknown {
  return column.parseValue
    ? column.parseValue(draft, row)
    : parseCellEditValue(
        resolveCellEditor(column, featureHost) ?? "text",
        draft
      );
}

/**
 * Create the row-form store.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link RowEditStoreOptions}.
 * @returns The store; inert unless `enabled`.
 *
 * @public
 */
export function createRowEditStore<TRow>(
  options: RowEditStoreOptions<TRow>
): RowEditStore<TRow> {
  let current = options;
  let snapshot: RowEditSnapshot = {
    activeRowId: null,
    drafts: {},
    isDirty: false,
  };
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
  // The row and its seeds as they were when the edit opened: what "changed"
  // is measured against, and what the patch is built from. Outside the
  // snapshot because a save reads them in the same tick a keystroke wrote a
  // draft, and accepting a seed is not something the reader sees.
  let opened: { row: TRow; rowId: string; seeds: RowEditDrafts } | null = null;

  const write = (activeRowId: string | null, drafts: RowEditDrafts): void => {
    const isDirty =
      opened !== null &&
      Object.entries(drafts).some(
        ([key, value]) => value !== opened?.seeds[key]
      );
    snapshot = { ...snapshot, activeRowId, drafts, isDirty };
    notify();
  };

  /** What the incoming row reads for these fields. */
  const incomingOf = (
    row: TRow,
    columnKeys: readonly string[]
  ): Record<string, string> => {
    const values: Record<string, string> = {};
    for (const column of editableColumns(current.columns, row)) {
      if (!columnKeys.includes(column.key)) continue;
      values[column.key] = readEditableCellValue(
        row,
        column,
        current.featureHost
      );
    }
    return values;
  };

  const close = (kind: "cancel" | "silent"): void => {
    const open = opened;
    if (kind === "cancel" && open) {
      observeEdit(current.onEditCancel, {
        row: open.row,
        rowId: open.rowId,
        columnKey: "",
        value: snapshot.drafts,
        previousValue: open.seeds,
        unit: "row",
      });
    }
    opened = null;
    if (
      snapshot.activeRowId === null &&
      Object.keys(snapshot.drafts).length === 0
    )
      return;
    write(null, {});
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
    configure(next) {
      if (disposed) return;
      if (
        next.enabled !== current.enabled ||
        next.columns !== current.columns ||
        next.onRowEdit !== current.onRowEdit ||
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
    begin(row, rowId) {
      if (disposed || current.enabled !== true) return;
      commit.invalidate();
      const seeds: Record<string, string> = {};
      for (const column of editableColumns(current.columns, row)) {
        seeds[column.key] = readEditableCellValue(
          row,
          column,
          current.featureHost
        );
      }
      opened = { row, rowId, seeds };
      write(rowId, seeds);
      observeEdit(current.onEditStart, {
        row,
        rowId,
        columnKey: "",
        value: seeds,
        previousValue: row,
        unit: "row",
      });
    },
    setDraft(columnKey, value) {
      if (disposed) return;
      const previous = snapshot.drafts[columnKey];
      if (previous === value) return;
      commit.invalidate();
      const open = opened;
      const seed = open?.seeds[columnKey];
      write(snapshot.activeRowId, { ...snapshot.drafts, [columnKey]: value });
      // The first time a field leaves what it read, it is the reader's — the
      // same event a batch fires when a row first changes. Opening the form
      // says which row; this says which fields inside it are at stake.
      if (open && previous === seed && value !== seed) {
        observeEdit(current.onEditStart, {
          row: open.row,
          rowId: open.rowId,
          columnKey,
          value,
          previousValue: seed,
          unit: "row",
        });
      }
    },
    save() {
      if (disposed || current.enabled !== true || commit.busy()) return;
      const open = opened;
      if (!open) return;
      const patch: Record<string, unknown> = {};
      const drafts = snapshot.drafts;
      for (const column of editableColumns(current.columns, open.row)) {
        const draft = drafts[column.key];
        if (draft === undefined || draft === open.seeds[column.key]) continue;
        patch[column.key] = parseColumnDraft(
          column,
          draft,
          open.row,
          current.featureHost
        );
      }
      if (Object.keys(patch).length === 0) {
        close("silent");
        return;
      }
      const edits = [{ row: open.row, rowId: open.rowId, patch }];
      const validate =
        current.validateRow !== undefined ||
        current.columns.some(
          (column) => column.validate && column.key in patch
        );
      const event = {
        row: open.row,
        rowId: open.rowId,
        columnKey: "",
        value: patch,
        previousValue: open.row,
        unit: "row" as const,
      };
      commit.run({
        validate: validate
          ? (active) => validateEditCommit(edits, current, active)
          : undefined,
        commit: () => current.onRowEdit?.(open.row, patch),
        committed: () => observeEdit(current.onEditCommit, event),
        success: () => close("silent"),
        failure: (error) =>
          observeEdit(current.onEditError, { ...event, error }),
        invalid: (failures) =>
          observeEdit(current.onValidationFail, {
            ...event,
            columnKey: failures[0]?.columnKey ?? "",
            error: failures[0]?.message,
          }),
        formatError: current.formatEditError,
      });
    },
    cancel() {
      if (disposed) return;
      commit.invalidate();
      close("cancel");
    },
    openedRow: () => opened?.row,
    seeds: () => opened?.seeds,
    acceptSeeds(row, columnKeys) {
      if (disposed) return;
      commit.invalidate();
      const open = opened;
      if (!open) return;
      opened = {
        row,
        rowId: open.rowId,
        seeds: { ...open.seeds, ...incomingOf(row, columnKeys) },
      };
    },
    takeSeeds(row, columnKeys) {
      if (disposed) return;
      commit.invalidate();
      const open = opened;
      if (!open) return;
      const incoming = incomingOf(row, columnKeys);
      opened = {
        row,
        rowId: open.rowId,
        seeds: { ...open.seeds, ...incoming },
      };
      write(snapshot.activeRowId, { ...snapshot.drafts, ...incoming });
    },
  };
}

/**
 * The digest of an open form's drafts, for a row memo comparator.
 *
 * @public
 */
export function rowEditSignature(snapshot: RowEditSnapshot): string {
  if (snapshot.activeRowId === null) return "";
  return `${snapshot.activeRowId}:${Object.entries(snapshot.drafts)
    .map(([key, value]) => `${key}=${value}`)
    .join("|")}`;
}

/**
 * The state a binding hands its cells, read off one snapshot.
 *
 * @param store - The store the actions go to.
 * @param snapshot - The form to read.
 * @param featureHost - The table that owns these editors.
 * @returns The row-editing state.
 *
 * @public
 */
export function rowEditingView<TRow>(
  store: RowEditStore<TRow>,
  snapshot: RowEditSnapshot,
  featureHost?: FeatureHostState
): RowEditingState<TRow> {
  const { activeRowId, drafts } = snapshot;
  return {
    activeRowId,
    isEditing: (rowId) => activeRowId === rowId,
    drafts,
    draftFor: (columnKey) => drafts[columnKey] ?? "",
    begin: store.begin,
    setDraft: store.setDraft,
    save: store.save,
    cancel: store.cancel,
    isDirty: snapshot.isDirty,
    commit: snapshot.commit,
    signature: rowEditSignature(snapshot),
    openedRow: store.openedRow,
    seeds: store.seeds,
    acceptSeeds: store.acceptSeeds,
    takeSeeds: store.takeSeeds,
    featureHost,
  };
}
