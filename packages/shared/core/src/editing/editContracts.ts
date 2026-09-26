/**
 * The editing contracts a host writes against: how a live update that
 * disagrees with an open editor is settled, what the lifecycle observers
 * receive, and what a validator returns.
 *
 * They are data and callbacks, so every binding shares them; the editing
 * state machines that honour them live beside the binding that renders the
 * editors.
 */

/**
 * How an unhandled conflict is resolved.
 *
 * @public
 */
export type EditConflictPolicy = "keep" | "take" | "ask";

/**
 * The host's choice, when it makes one.
 *
 * @public
 */
export type EditConflictChoice = "keep" | "take";

/**
 * One field that moved underneath an open editor.
 *
 * @public
 */
export interface EditConflictChange {
  /** The column whose stored value moved. */
  readonly columnKey: string;
  /** What it read when the editor opened. */
  readonly previous: string;
  /** What it reads now. */
  readonly incoming: string;
}

/**
 * One conflict. `row` is what just arrived; `previous` is the snapshot the
 * editor opened against (or last accepted).
 *
 * @public
 */
export interface EditConflict<TRow> {
  /**
   * What the reader has open: one cell, or a whole row edited as one unit.
   * A row conflict names no column — every field in the form is affected.
   */
  unit: "cell" | "row";
  /** The incoming row. */
  row: TRow;
  /** The row as it was when the editor opened (or last accepted). */
  previous: TRow;
  /** Its stable id. */
  rowId: string;
  /** The column being edited. */
  columnKey: string;
  /** What the reader has typed. */
  draft: string;
  /** The incoming cell value. */
  incomingValue: string;
  /** The cell value the editor opened against. */
  previousValue: string;
  /**
   * Every editable field that moved, so a notice can say what arrived rather
   * than only that something did. A cell conflict names its one field here
   * too; a row conflict lists them all, and is empty when `rowVersion` says
   * the row moved without any field the reader can see changing.
   */
  changes: readonly EditConflictChange[];
}

/**
 * What a host returns from {@link EditConflictHandler}. `void` defers to policy.
 *
 * @public
 */
export type EditConflictHandler<TRow> = (
  conflict: EditConflict<TRow>
) => EditConflictChoice | void;

/**
 * Which commit unit produced an event.
 *
 * @public
 */
export type EditUnit = "cell" | "row" | "batch";

/**
 * One lifecycle event. `columnKey` is the edited field for a cell, and empty
 * for a row or batch whose payload is the whole patch (or list of patches).
 *
 * @public
 */
export interface EditEvent<TRow> {
  /** The row as it was when the gesture started. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** The column, or `""` when the unit is the whole row or a batch. */
  columnKey: string;
  /** What the reader arrived at — the parsed value, the patch, or the edits. */
  value: unknown;
  /** What was there before. */
  previousValue: unknown;
  /** Which commit unit fired this. */
  unit: EditUnit;
  /** Why a commit was refused, or why a save rejected. */
  error?: string;
}

/**
 * A host callback that observes one kind of event.
 *
 * @public
 */
export type EditEventHandler<TRow> = (event: EditEvent<TRow>) => void;

/**
 * The five observers a host may wire. All optional, all inert when omitted.
 *
 * @public
 */
export interface EditLifecycle<TRow> {
  /** An editor opened. */
  onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the draft away. */
  onEditCancel?: EditEventHandler<TRow>;
  /** The host received the value. */
  onEditCommit?: EditEventHandler<TRow>;
  /** A validator refused the value; the editor stayed open. */
  onValidationFail?: EditEventHandler<TRow>;
  /** A save promise rejected. */
  onEditError?: EditEventHandler<TRow>;
}

/**
 * Validate one edited value. Return a message to reject it, nothing to allow.
 *
 * @public
 */
export type CellValidator<TRow> = (
  value: unknown,
  row: TRow
) => string | undefined | Promise<string | undefined>;

/**
 * Validate the row an edit would produce.
 *
 * Return a message for a row-level problem, a map of column key → message to
 * mark individual cells, or nothing to allow the commit.
 *
 * @public
 */
export type RowValidator<TRow> = (
  row: TRow
) =>
  | string
  | Record<string, string>
  | undefined
  | Promise<string | Record<string, string> | undefined>;

/**
 * A cell address, as the editing state spells it.
 *
 * @public
 */
export interface ValidationTarget {
  /** Identity of the row. */
  rowId: string;
  /** Key of the column. */
  columnKey: string;
}

/**
 * One row's pending changes.
 *
 * @public
 */
export interface BatchRowEdit<TRow> {
  /** The row as it was when the reader started changing it. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** Parsed values by column key — only the fields that actually changed. */
  patch: Readonly<Record<string, unknown>>;
}
