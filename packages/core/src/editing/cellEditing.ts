import type { ReactElement } from "react";

import { currentFeatureHost } from "../features/currentHost";
import type { SortableValue } from "../types";
import { getPath } from "../utils/path";

/** One choice in a select cell editor. */
export interface CellEditorOption {
  value: string;
  label: string;
}

/**
 * Editor descriptor for an editable column — mirrors the declarative
 * `filter` shorthand: a bare type, or a select with options (objects or
 * plain value strings).
 */
export type CellEditor =
  | "text"
  | "number"
  /** A checkbox. Commits `true` / `false`, never a string. */
  | "boolean"
  /** A date. Commits `YYYY-MM-DD`, the value a date input holds. */
  | "date"
  /** A date and a time. Commits `YYYY-MM-DDTHH:mm`. */
  | "datetime"
  /** A time of day. Commits `HH:mm`. */
  | "time"
  | {
      type: "select";
      options: readonly CellEditorOption[] | readonly string[];
    }
  | {
      /** Several of a fixed set. Commits an array of the chosen values. */
      type: "multi-select";
      options: readonly CellEditorOption[] | readonly string[];
    }
  | {
      /**
       * Your own React editor. The table still owns activation, focus, the
       * keyboard flow, validation and the commit — the component owns what the
       * reader looks at and types into.
       */
      type: "custom";
      render: CustomCellEditorRender;
    };

/**
 * A bring-your-own editor.
 *
 * Everything the table already does stays the table's: double-click / Enter /
 * F2 activates, focus returns to the cell afterwards, Enter commits, Escape
 * cancels, Tab moves on, validators gate the commit. What arrives here is the
 * draft and the two calls that change it — so an autocomplete, a rich-text
 * field or a colour picker becomes an editor without reimplementing any of that.
 */
export type CustomCellEditorRender = (
  ctrl: CustomCellEditorCtrl
) => ReactElement;

/** What a custom editor is handed. */
export interface CustomCellEditorCtrl {
  /** The draft, as the table holds it. */
  draft: string;
  /** Replace the draft. Does not commit. */
  setDraft: (value: string) => void;
  /**
   * Commit now, without waiting for Enter or a blur — what a picker calls when
   * the reader chooses something, since a choice IS the gesture.
   */
  commit: () => void;
  /** Abandon the draft, exactly as Escape does. */
  cancel: () => void;
  /**
   * Wire to the editor's own `onKeyDown` to keep Enter / Escape / Tab working.
   * An editor that swallows them (a combobox using Enter to choose) simply does
   * not call this for the keys it owns.
   */
  onKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  /** Commit on click-away. Wire to `onBlur` unless the editor is a popover. */
  onBlur: () => void;
  /** Attach to the element that should take focus when the cell opens. */
  focusRef: (node: { focus: () => void } | null) => void;
  /** Accessible name for the control — the column's header, resolved. */
  label: string;
  /** A validator's message for this cell, if the last commit was rejected. */
  error?: string;
  /** Whether an async validator is still deciding. */
  validating: boolean;
  /** `id` of the message element, for `aria-describedby`. */
  errorId: string;
}

/**
 * Minimal column surface the editing helpers need. {@link ColumnDef}
 * satisfies this; using a narrow shape avoids `ColumnDef<T>` variance
 * issues when Tab-navigation crosses generic boundaries.
 *
 * `editable` uses a bivariant callback (same pattern as React's event
 * handlers) so `ColumnDef<Person>` is assignable to `EditableColumnLike`.
 */
export interface EditableColumnLike<TRow = unknown> {
  key: string;
  editable?: boolean | { bivarianceHack(row: TRow): boolean }["bivarianceHack"];
  editor?: CellEditor;
  editValue?: { bivarianceHack(row: TRow): string }["bivarianceHack"];
  parseValue?: {
    bivarianceHack(draft: string, row: TRow): unknown;
  }["bivarianceHack"];
  validate?: {
    bivarianceHack(
      value: unknown,
      row: TRow
    ): string | undefined | Promise<string | undefined>;
  }["bivarianceHack"];
  sortValue?: { bivarianceHack(row: TRow): SortableValue }["bivarianceHack"];
}

/** The active cell being edited. */
export interface CellEditTarget {
  rowId: string;
  columnKey: string;
}

/** Result of a successful commit (host applies via `onCellEdit`). */
export interface CellEditCommit {
  rowId: string;
  columnKey: string;
  /** Raw draft string from the editor. */
  draft: string;
}

/** Whether this editor is the host's own component. */
export function isCustomEditor(
  editor: CellEditor | null
): editor is { type: "custom"; render: CustomCellEditorRender } {
  return (
    editor !== null && typeof editor === "object" && editor.type === "custom"
  );
}

/** Whether this editor is a checkbox. */
export function isBooleanEditor(editor: CellEditor | null): boolean {
  return editor === "boolean";
}

/** Whether this editor chooses several of a fixed set. */
export function isMultiSelectEditor(
  editor: CellEditor | null
): editor is { type: "multi-select"; options: readonly CellEditorOption[] } {
  return (
    editor !== null &&
    typeof editor === "object" &&
    editor.type === "multi-select"
  );
}

/** Whether this editor chooses one of a fixed set. */
export function isSelectEditor(
  editor: CellEditor | null
): editor is { type: "select"; options: readonly CellEditorOption[] } {
  return (
    editor !== null && typeof editor === "object" && editor.type === "select"
  );
}

/**
 * The native `type` an editor's input takes.
 *
 * One mapping for nine kits: every one of them renders a real `<input>`
 * underneath, and the browser's own date and time controls are
 * keyboard-complete and localized by the platform — a better answer than nine
 * hand-built pickers.
 *
 * A checkbox is not among these: a boolean editor renders its own control, and
 * several kits' text fields reject `type="checkbox"` outright.
 *
 * @param editor - The column's editor descriptor.
 * @returns The `type` attribute for the editor's input.
 */
export function editorInputType(
  editor: CellEditor | null
): "text" | "number" | "date" | "datetime-local" | "time" {
  if (editor === "number") return "number";
  if (editor === "date") return "date";
  if (editor === "datetime") return "datetime-local";
  if (editor === "time") return "time";
  return "text";
}

/** The draft string a checkbox holds. */
export function booleanDraft(checked: boolean): string {
  return checked ? "true" : "false";
}

/** Whether a boolean editor's draft is on. */
export function isDraftChecked(draft: string): boolean {
  return draft === "true";
}

/** Normalize select options to `{ value, label }` pairs. */
export function normalizeEditorOptions(
  options: readonly CellEditorOption[] | readonly string[]
): CellEditorOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
}

/** Whether any column opts into editing (ignores per-row predicates). */
export function hasEditableColumns(
  columns: readonly EditableColumnLike[]
): boolean {
  return columns.some(
    (column) => column.editable !== undefined && column.editable !== false
  );
}

/** Whether a column is editable for a given row. */
export function isCellEditable<TRow>(
  column: EditableColumnLike<TRow>,
  row: TRow
): boolean {
  const flag = column.editable;
  if (flag === undefined || flag === false) return false;
  if (flag === true) return true;
  return flag(row);
}

const BUILTIN_EDITORS = new Set<string>([
  "text",
  "number",
  "boolean",
  "date",
  "datetime",
  "time",
]);

function resolveEditorValue(editor: CellEditor): CellEditor {
  if (typeof editor !== "string" || BUILTIN_EDITORS.has(editor)) return editor;
  const render = currentFeatureHost()?.editors.get(editor);
  return render ? { type: "custom", render } : editor;
}

/**
 * Resolve the editor for a column that opts into editing.
 * Returns `null` when the column is not editable — adapters must not
 * render an editor affordance without a non-null result AND a table-level
 * `onCellEdit` handler.
 *
 * A string that is not a built-in name is a plugin type registered with
 * {@link TableFeatureHost.registerEditor}; it resolves to
 * `{ type: "custom", render }` so adapters stay on one path.
 */
export function resolveCellEditor(
  column: EditableColumnLike
): CellEditor | null {
  if (column.editable === undefined || column.editable === false) return null;
  return resolveEditorValue(column.editor ?? "text");
}

/**
 * Stringify a cell's current value for the editor draft.
 * Prefers `editValue`, then `sortValue`, then `getPath(row, key)`.
 * Non-primitive path values yield `""` so we never seed `[object Object]`.
 */
export function readEditableCellValue<TRow>(
  row: TRow,
  column: EditableColumnLike<TRow>
): string {
  const seed = readSeed(row, column);
  // A date editor holds a day, a time editor holds a time of day: trim the
  // stored value to the part its own input can hold, or the browser rejects it
  // and the editor opens empty.
  return trimToEditor(seed, resolveCellEditor(column));
}

/** The raw seed, before the editor's own shape is applied. */
function readSeed<TRow>(row: TRow, column: EditableColumnLike<TRow>): string {
  if (column.editValue) return column.editValue(row);
  if (column.sortValue) return stringifyEditSeed(column.sortValue(row));
  return stringifyEditSeed(getPath(row, column.key));
}

/** Cut a `YYYY-MM-DDTHH:mm` seed down to what a date or time input holds. */
function trimToEditor(seed: string, editor: CellEditor | null): string {
  if (editor === "date") return seed.slice(0, 10);
  if (editor === "time") {
    const at = seed.indexOf("T");
    return at === -1 ? seed.slice(0, 5) : seed.slice(at + 1, at + 6);
  }
  return seed;
}

function stringifyEditSeed(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  // A multi-select's stored value is the array it commits, so it seeds its own
  // editor without the host writing an `editValue` for the round trip.
  if (Array.isArray(value)) {
    return formatMultiDraft(value.map(String));
  }
  // A Date seeds the date editors in the shape their inputs hold. Local parts,
  // not the ISO string: `toISOString` shifts to UTC, which moves the day for
  // most of the world.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return localDateTimeParts(value);
  }
  return "";
}

/** `YYYY-MM-DDTHH:mm` in local time — a `datetime` input's own format. */
function localDateTimeParts(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${String(value.getFullYear())}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  return `${date}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/**
 * Parse a draft string into the value passed to `onCellEdit`.
 * Number editors yield `number | null` (empty / invalid → `null`);
 * select and text stay strings.
 */
export function parseCellEditValue(editor: CellEditor, draft: string): unknown {
  if (editor === "number") return parseNumberDraft(draft);
  if (editor === "boolean") return draft === "true";
  if (typeof editor === "object" && editor.type === "multi-select") {
    return parseMultiDraft(draft);
  }
  // A date, datetime or time editor commits the string its input holds —
  // `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`, `HH:mm`. A `Date` would be worse: it
  // carries a timezone the reader never chose, and "the 3rd" is not an instant.
  return draft;
}

/** An empty number field is nothing, not zero. */
function parseNumberDraft(draft: string): number | null {
  const trimmed = draft.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * A multi-select's draft is its chosen values joined by the unit separator.
 *
 * A control character rather than a comma: an option's own label may contain
 * one, and a separator that can appear inside a value is not a separator.
 */
function parseMultiDraft(draft: string): string[] {
  return draft === "" ? [] : draft.split(MULTI_SEPARATOR);
}

/** The separator {@link formatMultiDraft} joins a multi-select's values with. */
export const MULTI_SEPARATOR = "\u001f";

/**
 * The draft string for a set of chosen values — the inverse of the parse above.
 *
 * @param values - The chosen values.
 * @returns The draft the editing state holds.
 */
export function formatMultiDraft(values: readonly string[]): string {
  return values.join(MULTI_SEPARATOR);
}

/**
 * The chosen values inside a multi-select draft.
 *
 * @param draft - The draft the editing state holds.
 * @returns The chosen values, in the order they were joined.
 */
export function readMultiDraft(draft: string): string[] {
  return parseMultiDraft(draft);
}

/**
 * Find the next (or previous) editable cell in row-major order (wraps).
 * Returns `null` when no other editable cell exists.
 */
export function stepEditableCell<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly EditableColumnLike<TRow>[];
  rowKey: (row: TRow) => string;
  from: CellEditTarget;
  /** `1` advances (Tab); `-1` goes previous (Shift+Tab). */
  direction?: 1 | -1;
}): CellEditTarget | null {
  const { rows, columns, rowKey, from, direction = 1 } = options;
  const editableCols = columns.filter(
    (c) => c.editable !== undefined && c.editable !== false
  );
  if (editableCols.length === 0 || rows.length === 0) return null;

  const rowIndex = rows.findIndex((r) => rowKey(r) === from.rowId);
  const colIndex = editableCols.findIndex((c) => c.key === from.columnKey);
  if (rowIndex < 0 || colIndex < 0) return null;

  const total = rows.length * editableCols.length;
  for (let step = 1; step < total; step++) {
    const flat =
      (((rowIndex * editableCols.length + colIndex + direction * step) %
        total) +
        total) %
      total;
    const nextRow = Math.floor(flat / editableCols.length);
    const nextCol = flat % editableCols.length;
    const row = rows[nextRow]!;
    const column = editableCols[nextCol]!;
    if (isCellEditable(column, row)) {
      return { rowId: rowKey(row), columnKey: column.key };
    }
  }
  return null;
}

/** Tab-advance form of {@link stepEditableCell}, fixed to `direction: 1`. */
export function nextEditableCell<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly EditableColumnLike<TRow>[];
  rowKey: (row: TRow) => string;
  from: CellEditTarget;
}): CellEditTarget | null {
  return stepEditableCell({ ...options, direction: 1 });
}

/**
 * The row, the column and the parsed value a commit resolves to.
 *
 * Separate from applying it, because validation has to see the value BEFORE the
 * host does — the whole point of a validator is to stop the call.
 *
 * @typeParam TRow - The row type.
 * @param options - The commit and the page it addresses.
 * @returns The resolved triple, or `null` for a stale commit whose row or
 * column has since left the page.
 */
export function resolveCommitValue<TRow>(options: {
  commit: CellEditCommit;
  rows: readonly TRow[];
  columns: readonly EditableColumnLike<TRow>[];
  rowKey: (row: TRow) => string;
}): { row: TRow; column: EditableColumnLike<TRow>; value: unknown } | null {
  const row = options.rows.find(
    (r) => options.rowKey(r) === options.commit.rowId
  );
  const column = options.columns.find(
    (c) => c.key === options.commit.columnKey
  );
  if (!row || !column) return null;
  const editor = resolveCellEditor(column) ?? "text";
  // A column that states how to read its own drafts owns the conversion; the
  // editor's built-in parsing is the fallback, not an extra step on top.
  const value = column.parseValue
    ? column.parseValue(options.commit.draft, row)
    : parseCellEditValue(editor, options.commit.draft);
  return { row, column, value };
}

/**
 * Apply a commit through the host channel: resolve the row, parse the draft
 * with the column's editor, call `onCellEdit`. Returns `false` when the row
 * or column is missing (stale commit after a filter/page change).
 */
export function applyCellEditCommit<TRow>(options: {
  commit: CellEditCommit;
  rows: readonly TRow[];
  columns: readonly EditableColumnLike<TRow>[];
  rowKey: (row: TRow) => string;
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => void;
}): boolean {
  const resolved = resolveCommitValue(options);
  if (!resolved) return false;
  options.onCellEdit(resolved.row, resolved.column.key, resolved.value);
  return true;
}
