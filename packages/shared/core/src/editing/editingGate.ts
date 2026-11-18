/**
 * The rules that decide what an editable cell and the row's edit controls
 * show: which editing units the host armed, which unit owns a cell, which keys
 * open, save and cancel, where focus goes when a row opens, and what the row
 * and batch controls offer while a live update is waiting on the reader.
 *
 * Every binding draws these with its own components; the answers are the same
 * in all of them, so they live here once.
 */
import type { RowAction, TableLabels } from "../types";
import type { BatchEditingState } from "./batchEditing";
import {
  type CellEditor,
  type CustomCellEditorConflict,
  isCustomEditor,
  normalizeEditorOptions,
} from "./cellEditing";
import type { EditableCellController, EditingBundle } from "./editableCell";
import type { RowEditingState } from "./rowEditing";

/* ── Arming ────────────────────────────────────────────────────────── */

/**
 * The editing props a table reads to decide what it arms.
 *
 * @public
 */
export interface EditingArmingProps {
  /** The per-cell channel. */
  readonly onCellEdit?: unknown;
  /** Row mode's switch. */
  readonly rowEditing?: boolean;
  /** Row mode's channel. */
  readonly onRowEdit?: unknown;
  /** Batch mode's switch. */
  readonly batchEditing?: boolean;
  /** Batch mode's channel. */
  readonly onBatchEdit?: unknown;
  /** Whether unsaved cells are marked. */
  readonly dirtyIndicators?: boolean;
  /** The host's own unsaved-edit observer. */
  readonly onDirtyChange?: unknown;
}

/**
 * Which editing units a table runs.
 *
 * @public
 */
export interface EditingArming {
  /** Each cell commits on its own. */
  readonly cell: boolean;
  /** A row is edited as one form. */
  readonly row: boolean;
  /** Many rows are held and saved together. */
  readonly batch: boolean;
  /** Whether any unit is armed — whether the table builds a bundle at all. */
  readonly any: boolean;
  /** Whether unsaved cells are tracked — for marks, or for the host's count. */
  readonly trackDirty: boolean;
  /** Whether unsaved cells are drawn. */
  readonly dirtyMarkers: boolean;
}

/**
 * Resolve which editing units a table runs.
 *
 * A mode is armed by its switch AND its channel: a row form with nowhere to
 * send the patch would lose everything the reader typed.
 *
 * @param props - See {@link EditingArmingProps}.
 * @returns See {@link EditingArming}.
 *
 * @public
 */
export function resolveEditingArming(props: EditingArmingProps): EditingArming {
  const cell = props.onCellEdit !== undefined;
  const row = props.rowEditing === true && props.onRowEdit !== undefined;
  const batch = props.batchEditing === true && props.onBatchEdit !== undefined;
  const dirtyMarkers = props.dirtyIndicators === true;
  return {
    cell,
    row,
    batch,
    any: cell || row || batch,
    trackDirty: dirtyMarkers || props.onDirtyChange !== undefined,
    dirtyMarkers,
  };
}

/* ── Which unit owns a cell ────────────────────────────────────────── */

/**
 * What one editable cell renders.
 *
 * - `batch`: a batch field — every editable cell is one.
 * - `row`: a field of the row form open on this row.
 * - `display`: the plain content — nothing edits this cell.
 * - `custom-editor`: the column's own editor, open.
 * - `editor`: the kit's editor, open.
 * - `activatable`: the idle cell that opens the editor.
 *
 * @public
 */
export type EditableCellPresentation =
  "batch" | "row" | "display" | "custom-editor" | "editor" | "activatable";

/**
 * Which unit owns this cell.
 *
 * A batch comes first: the reader is walking a list correcting values, and
 * opening each cell first is the friction the mode exists to remove. A row
 * open as one form comes next: the per-cell activate control would be a second
 * way to start an edit that is already open. Only then does the cell's own
 * controller decide.
 *
 * @param editing - The bundle, or `undefined` when nothing is armed.
 * @param rowId - The cell's row.
 * @param controller - The cell's controller.
 * @returns See {@link EditableCellPresentation}.
 *
 * @public
 */
export function editableCellPresentation<TRow>(
  editing: EditingBundle<TRow> | undefined,
  rowId: string,
  controller: Pick<EditableCellController<TRow>, "mode" | "editor">
): EditableCellPresentation {
  if (editing?.batch) return "batch";
  if (editing?.rowEditing?.isEditing(rowId) === true) return "row";
  if (controller.mode === "display") return "display";
  if (controller.mode === "editing") {
    if (isCustomEditor(controller.editor)) return "custom-editor";
    if (controller.editor) return "editor";
  }
  return "activatable";
}

/**
 * Whether a column is the first editable one — the field a row edit focuses.
 *
 * By column order rather than by which cell renders first, so the answer is the
 * same in a windowed body and in a reordered one.
 *
 * @public
 */
export function isFirstEditableColumn(
  columns: readonly { key: string; editable?: unknown }[],
  key: string
): boolean {
  const first = columns.find(
    (column) => column.editable !== undefined && column.editable !== false
  );
  return first?.key === key;
}

/* ── Keys ──────────────────────────────────────────────────────────── */

/**
 * Whether a key on the idle cell opens its editor: Enter or F2.
 *
 * @public
 */
export function isEditActivateKey(key: string): boolean {
  return key === "Enter" || key === "F2";
}

/**
 * Whether a key in an open editor hands focus back to the idle cell after.
 * Escape cancels and Enter commits, and both leave the reader on the cell;
 * Tab moves to the next editable cell, which manages its own focus.
 *
 * @public
 */
export function editorKeyRestoresFocus(key: string): boolean {
  return key === "Escape" || key === "Enter";
}

/**
 * Keep an editor's own keys out of the table's key handler.
 *
 * Enter, Escape and Tab all mean something to BOTH an open editor and the grid
 * around it: the editor commits, cancels or moves to the next field, and the
 * table would also move focus or leave edit mode on the same press. The editor
 * is the one the user is typing in, so it wins — and the table never sees it.
 *
 * Structural event on purpose, so this stays usable from any framework's
 * handler and from a plain listener.
 *
 * @public
 */
export function stopEditKeys(
  event: Readonly<{ key: string; stopPropagation: () => void }>
): void {
  if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
    event.stopPropagation();
  }
}

/**
 * Whether saving the open row is held: any field of the row waiting on an
 * answer holds it, not just the one the reader stands in. When the row's own
 * state is unknown, this field's question decides.
 *
 * @public
 */
export function rowEditSaveBlocked(
  ask: CellConflictAsk | undefined,
  rowAsking: boolean | undefined
): boolean {
  return rowAsking ?? ask !== undefined;
}

/**
 * A key in a field of an open row form.
 *
 * Enter saves the whole row, Escape cancels it: in row mode the unit is the
 * row, so a per-cell commit would be a different feature wearing this one's
 * keys. Enter does nothing while the save is held — saving from an untouched
 * field would write over a value the reader has not looked at.
 *
 * @public
 */
export function handleRowEditorKey<TRow>(
  event: { key: string; preventDefault: () => void },
  rowEditing: Pick<RowEditingState<TRow>, "save" | "cancel">,
  saveBlocked: boolean
): void {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!saveBlocked) rowEditing.save();
  } else if (event.key === "Escape") {
    event.preventDefault();
    rowEditing.cancel();
  }
}

/* ── Ids and ARIA ──────────────────────────────────────────────────── */

/**
 * The id of an open cell editor's message.
 *
 * @public
 */
export function editableCellErrorId(rowId: string, columnKey: string): string {
  return `adapttable-edit-error-${rowId}-${columnKey}`;
}

/**
 * The id of a row-form field's message.
 *
 * @public
 */
export function rowEditErrorId(columnKey: string): string {
  return `adapttable-row-edit-${columnKey}`;
}

/**
 * The id of a batch field's message.
 *
 * @public
 */
export function batchEditErrorId(rowId: string, columnKey: string): string {
  return `adapttable-batch-edit-${rowId}-${columnKey}`;
}

/**
 * What an editor's ARIA is read from.
 *
 * @public
 */
export interface EditorAriaState {
  /** The validator's message, when the last commit was rejected. */
  readonly error?: string;
  /** Whether an async validator is still deciding. */
  readonly validating: boolean;
  /** The id of the element holding the message. */
  readonly errorId: string;
  /** Whether a live row changed under this editor. */
  readonly conflict?: boolean;
}

/**
 * The ARIA a kit's editor needs when validation is in play.
 *
 * Spread onto the input or select: invalid marks the field, `describedby`
 * points at the message so it is read WITH the field rather than announced
 * once and lost, and busy says an async check is still deciding.
 *
 * @param ctrl - The editor's state.
 * @returns Attributes to spread; empty while the value is fine.
 *
 * @public
 */
export function editorValidationProps(ctrl: EditorAriaState): {
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-busy"?: true;
  "data-conflict"?: "";
} {
  return {
    "aria-invalid": ctrl.error === undefined ? undefined : true,
    "aria-describedby": ctrl.error === undefined ? undefined : ctrl.errorId,
    "aria-busy": ctrl.validating ? true : undefined,
    "data-conflict": ctrl.conflict === true ? "" : undefined,
  };
}

/**
 * Busy and conflict marks, for a kit whose own input owns `aria-invalid`.
 * `data-conflict` still belongs on the field so the same selector works on
 * every kit; `aria-describedby` points at the notice while one is up.
 *
 * @param ctrl - The editor's state.
 * @returns Attributes to spread; empty unless a check is running or a
 *   conflict is being asked.
 *
 * @public
 */
export function editorBusyProps(ctrl: EditorAriaState): {
  "aria-busy"?: true;
  "aria-describedby"?: string;
  "data-conflict"?: "";
} {
  const describedBy =
    ctrl.conflict === true ? { "aria-describedby": ctrl.errorId } : {};
  return {
    "aria-busy": ctrl.validating ? true : undefined,
    ...describedBy,
    "data-conflict": ctrl.conflict === true ? "" : undefined,
  };
}

/* ── Editors ───────────────────────────────────────────────────────── */

/**
 * The options a chooser editor carries, normalized; empty for any other.
 *
 * @public
 */
export function editorSelectOptions(
  editor: CellEditor
): ReturnType<typeof normalizeEditorOptions> {
  if (
    typeof editor === "object" &&
    (editor.type === "select" || editor.type === "multi-select")
  ) {
    return normalizeEditorOptions(editor.options);
  }
  return [];
}

/**
 * What a cell's idle content is: the display the row precomputed, else the
 * column's own `Cell`, else its accessor.
 *
 * @param display - The precomputed display, if any.
 * @param column - The column's `Cell` and `accessor`.
 * @param renderCell - Renders the column's `Cell` in the binding's own terms.
 * @param row - The row.
 * @returns What the idle cell shows.
 *
 * @public
 */
export function resolveEditableCellDisplay<TRow, TNode, TCell>(
  display: TNode | null | undefined,
  column: {
    readonly Cell?: TCell;
    readonly accessor?: (row: TRow) => TNode;
  },
  renderCell: (Cell: TCell) => TNode,
  row: TRow
): TNode | undefined {
  if (display !== undefined && display !== null) return display;
  if (column.Cell) return renderCell(column.Cell);
  return column.accessor?.(row);
}

/* ── Conflict questions ────────────────────────────────────────────── */

/**
 * What one cell needs to ask about an incoming value.
 *
 * @public
 */
export interface CellConflictAsk {
  /** What that field reads now. */
  readonly incomingValue: string;
  /** Keep the draft; accept the incoming value as the new stored value. */
  readonly keep: () => void;
  /** Replace the draft with the incoming value. */
  readonly take: () => void;
}

/**
 * The incoming value waiting on one cell the reader is working in.
 *
 * A row that changed underneath marks every field that moved, each with the
 * notice a cell already shows — the reader is choosing between two versions of
 * a value, which they cannot do without seeing the one that arrived. One cell,
 * one answer: a reader working across several columns — or, in a batch,
 * several rows — settles each on its own, and the rest stand.
 *
 * @param editing - The bundle, or `undefined` when nothing is armed.
 * @param rowId - The cell's row.
 * @param columnKey - The cell's column.
 * @returns The question, or `undefined` when this cell is not being asked about.
 *
 * @public
 */
export function cellConflictAsk<TRow>(
  editing: Pick<EditingBundle<TRow>, "conflict"> | undefined,
  rowId: string,
  columnKey: string
): CellConflictAsk | undefined {
  const conflict = editing?.conflict;
  const cell = conflict?.contestedCell(rowId, columnKey);
  if (!conflict || !cell) return undefined;
  return {
    incomingValue: cell.incomingValue,
    keep: () => {
      conflict.keepCell(rowId, columnKey);
    },
    take: () => {
      conflict.takeCell(rowId, columnKey);
    },
  };
}

/**
 * The open cell's own question, in the shape a notice reads.
 *
 * @public
 */
export function controllerConflictAsk<TRow>(
  controller: Pick<
    EditableCellController<TRow>,
    "conflict" | "keepConflict" | "takeConflict"
  >
): CellConflictAsk | undefined {
  if (!controller.conflict) return undefined;
  return {
    incomingValue: controller.conflict.incomingValue,
    keep: controller.keepConflict,
    take: controller.takeConflict,
  };
}

/**
 * The question a contested field is waiting on, in the shape a host's own
 * editor is handed. The table still draws its notice; this is for an editor
 * that wants the choice inside its own surface.
 *
 * @public
 */
export function customEditorConflict(
  ask: CellConflictAsk | undefined
): CustomCellEditorConflict | undefined {
  if (!ask) return undefined;
  return { incomingValue: ask.incomingValue, keep: ask.keep, take: ask.take };
}

/**
 * An incoming change to the row a form has open.
 *
 * The fields that moved carry the question themselves, each with the notice a
 * cell shows; this is what the row's own controls need to know — that an
 * answer is outstanding, so there is nothing to save yet.
 *
 * @public
 */
export interface RowEditConflict {
  /** Whether this row is waiting on an answer. */
  readonly asking: boolean;
}

/**
 * The incoming-change question for one row, built from the editing bundle.
 *
 * @param editing - The bundle, or `undefined` when nothing is armed.
 * @param rowId - The row this control set belongs to.
 * @returns The question, or `undefined` when nothing is being asked.
 *
 * @public
 */
export function rowEditConflict<TRow>(
  editing: Pick<EditingBundle<TRow>, "conflict"> | undefined,
  rowId: string
): RowEditConflict | undefined {
  const conflict = editing?.conflict;
  if (!conflict) return undefined;
  return { asking: conflict.isRowConflict(rowId) };
}

/* ── The row's controls ────────────────────────────────────────────── */

/**
 * How one row's actions cell should render.
 *
 * @public
 */
export interface RowEditTrigger<TRow> {
  /** The actions to offer, with any row-edit trigger wired to the form. */
  readonly actions: readonly RowAction<TRow>[];
  /**
   * Whether the built-in control that opens the row should be drawn. `false`
   * once a host action owns that trigger. Save and cancel are unaffected:
   * they belong to the open row, not to whatever opened it.
   */
  readonly showBegin: boolean;
}

/**
 * Resolve one row's actions against its edit state.
 *
 * With no `editsRow` action the list passes through untouched. With one, and
 * row-mode editing armed, it opens this row's form; while that row is open the
 * trigger steps aside, because the row is already showing save and cancel.
 * With one and no row-mode editing, the action is dropped — there is no form
 * for it to open.
 *
 * @typeParam TRow - The row type.
 * @param actions - The resolved action list for the table.
 * @param rowEditing - Row-mode state, or `undefined` when it is not armed.
 * @param row - The row this cell belongs to.
 * @param rowId - Its stable id.
 * @returns See {@link RowEditTrigger}.
 *
 * @public
 */
export function resolveRowEditTrigger<TRow>(
  actions: readonly RowAction<TRow>[] | undefined,
  rowEditing: Pick<RowEditingState<TRow>, "isEditing" | "begin"> | undefined,
  row: TRow,
  rowId: string
): RowEditTrigger<TRow> {
  const list = actions ?? [];
  if (!list.some((action) => action.editsRow === true)) {
    return { actions: list, showBegin: true };
  }
  if (!rowEditing) {
    return {
      actions: list.filter((action) => action.editsRow !== true),
      showBegin: true,
    };
  }
  const open = rowEditing.isEditing(rowId);
  return {
    actions: list.flatMap((action) => {
      if (action.editsRow !== true) return [action];
      if (open) return [];
      return [
        {
          ...action,
          onClick: () => {
            rowEditing.begin(row, rowId);
          },
        },
      ];
    }),
    showBegin: false,
  };
}

/**
 * What `rowEditControls` reads.
 *
 * @public
 */
export interface RowEditControlsOptions<TRow> {
  /** The row-editing state from the chrome. */
  rowEditing: RowEditingState<TRow>;
  /** The row this control set belongs to. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
}

/**
 * What a kit needs to render the row's edit / save / cancel controls.
 *
 * @public
 */
export interface RowEditControls {
  /** Whether this row is the one being edited. */
  editing: boolean;
  /** Open this row for editing. */
  begin: () => void;
  /** Hand the host everything that changed. */
  save: () => void;
  /** Throw the drafts away. */
  cancel: () => void;
  /** Accessible name for the control that opens the row. */
  editLabel: string;
  /** Accessible name for save. */
  saveLabel: string;
  /** Accessible name for cancel. */
  cancelLabel: string;
  /** Whether anything actually changed — a save with nothing to save is inert. */
  dirty: boolean;
}

/**
 * The row-mode controls, resolved.
 *
 * A helper rather than a component because each kit renders its own buttons —
 * what is shared is which ones exist, what they are called, and what they do.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link RowEditControlsOptions}.
 * @returns The controls to render.
 *
 * @public
 */
export function rowEditControls<TRow>({
  rowEditing,
  row,
  rowId,
  labels,
}: Readonly<RowEditControlsOptions<TRow>>): RowEditControls {
  return {
    editing: rowEditing.isEditing(rowId),
    begin: () => {
      rowEditing.begin(row, rowId);
    },
    save: rowEditing.save,
    cancel: rowEditing.cancel,
    editLabel: labels?.editRow ?? "Edit row",
    saveLabel: labels?.saveRow ?? "Save row",
    cancelLabel: labels?.cancel ?? "Cancel",
    dirty: rowEditing.isDirty,
  };
}

/**
 * Which of the row's controls to draw.
 *
 * - `none`: nothing — a host action owns the trigger and the row is closed.
 * - `begin`: the control that opens the row.
 * - `open`: cancel, and save unless `showSave` is false.
 *
 * @public
 */
export type RowEditActionsLayout =
  | { readonly kind: "none" }
  | { readonly kind: "begin" }
  | { readonly kind: "open"; readonly showSave: boolean };

/**
 * Which of the row's controls to draw.
 *
 * While the notice holds the question, the row offers no way to SAVE: a form
 * measured against a row that has since moved would write over a change the
 * reader never saw. Cancel stays — abandoning a draft is always theirs to do,
 * and taking away the way out leaves them holding a form they can neither
 * finish nor drop. A closed row whose trigger a host action owns draws nothing,
 * or two identical triggers would sit side by side.
 *
 * @public
 */
export function rowEditActionsLayout(
  controls: Pick<RowEditControls, "editing">,
  conflict: RowEditConflict | undefined,
  showBegin: boolean | undefined
): RowEditActionsLayout {
  if (!controls.editing) {
    return showBegin === false ? { kind: "none" } : { kind: "begin" };
  }
  return { kind: "open", showSave: conflict?.asking !== true };
}

/* ── The batch bar ─────────────────────────────────────────────────── */

/**
 * "3 unsaved rows" — replaceable through `labels.pendingRows`.
 *
 * @public
 */
export function defaultPendingRows(count: number): string {
  return count === 1 ? "1 unsaved row" : `${String(count)} unsaved rows`;
}

/**
 * What the bar that ends a batch shows.
 *
 * @public
 */
export interface BatchEditBarModel {
  /** How many rows are waiting, in words. */
  readonly count: string;
  /**
   * What holds the save, when a cell is waiting on an answer; the bar says
   * this in place of the save control.
   */
  readonly conflictMessage: string | undefined;
  /** Save all's label. */
  readonly saveLabel: string;
  /** Cancel all's label. */
  readonly cancelLabel: string;
}

/**
 * What the bar that ends a batch shows, or `null` when nothing is pending — a
 * bar that is always there says the table is in a mode, when what matters is
 * that there are unsaved changes.
 *
 * @public
 */
export function batchEditBarModel<TRow>(
  batch: Pick<BatchEditingState<TRow>, "pending" | "count">,
  contested: boolean | undefined,
  labels: TableLabels | undefined
): BatchEditBarModel | null {
  if (!batch.pending) return null;
  return {
    count: (labels?.pendingRows ?? defaultPendingRows)(batch.count),
    conflictMessage:
      contested === true
        ? (labels?.editConflict ?? "This row changed while you were editing")
        : undefined,
    saveLabel: labels?.saveAll ?? "Save all",
    cancelLabel: labels?.cancelAll ?? "Cancel all",
  };
}

/**
 * The draft side of a row or batch editor: what it shows, how a keystroke
 * changes it, the keys it answers, and the validation it reports.
 *
 * @public
 */
export interface EditorDraftControl {
  /** The value being edited, as text. */
  draft: string;
  /** Replaces the draft on every keystroke. */
  setDraft: (value: string) => void;
  /** Handles the editor's keys. */
  onEditorKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  /** Runs when focus leaves the editor. */
  commitOnBlur: () => void;
  /** The editor shape the column declared. */
  editor: CellEditor;
  /** Choices for a select editor, empty for other shapes. */
  selectOptions: ReturnType<typeof editorSelectOptions>;
  /** A validator's message for this cell, when the last save was refused. */
  error?: string;
  /** Whether a validator is still deciding. */
  validating: boolean;
}

/**
 * Props for a kit-native editor while a cell is active: its draft control,
 * where its validation message lives, what takes focus, and whether a live
 * row changed under it.
 *
 * @public
 */
export interface EditableCellEditorCtrl extends EditorDraftControl {
  /**
   * `id` of the element holding the message. Put it on the editor's
   * `aria-describedby` so the message is announced with the field, and set
   * `aria-invalid` when `error` is set.
   */
  errorId: string;
  /**
   * Attach as the editor's `ref` so the table decides what takes focus. In
   * cell mode that is this editor, every time; in row mode only the first
   * field of the row that opened.
   */
  focusRef: (node: { focus: () => void } | null) => void;
  /** A live row changed under this editor. */
  conflict?: boolean;
}

/** The validator's message for one cell of a row, from a commit snapshot. */
function cellFailure(
  commit: RowEditingState<unknown>["commit"],
  rowId: string | null | undefined,
  columnKey: string
): string | undefined {
  return commit?.validation?.find(
    (failure) =>
      failure.rowId === rowId &&
      (failure.columnKey === undefined || failure.columnKey === columnKey)
  )?.message;
}

/**
 * One field of a row opened as a form: Enter saves the row unless the row is
 * waiting on an answer, Escape cancels it, and leaving a field commits nothing.
 *
 * @param rowEditing - The table's row-editing state.
 * @param columnKey - The field's column.
 * @param editor - The editor the column resolved to.
 * @param saveBlocked - Whether the row is waiting on an answer.
 * @returns The field's draft control.
 *
 * @public
 */
export function rowEditorControl<TRow>(
  rowEditing: Pick<
    RowEditingState<TRow>,
    "draftFor" | "setDraft" | "save" | "cancel" | "commit" | "activeRowId"
  >,
  columnKey: string,
  editor: CellEditor,
  saveBlocked: boolean
): EditorDraftControl {
  return {
    draft: rowEditing.draftFor(columnKey),
    setDraft: (value) => {
      rowEditing.setDraft(columnKey, value);
    },
    onEditorKeyDown: (event) => {
      handleRowEditorKey(event, rowEditing, saveBlocked);
    },
    commitOnBlur: () => undefined,
    editor,
    selectOptions: editorSelectOptions(editor),
    error: cellFailure(rowEditing.commit, rowEditing.activeRowId, columnKey),
    validating: rowEditing.commit?.phase === "validating",
  };
}

/**
 * One cell of a batch: every cell is a field, no key ends the batch, and the
 * batch's save reports each refused cell on that cell.
 *
 * @param batch - The table's batch-editing state.
 * @param row - The row the cell belongs to.
 * @param rowId - That row's id.
 * @param columnKey - The cell's column.
 * @param editor - The editor the column resolved to.
 * @returns The cell's draft control.
 *
 * @public
 */
export function batchEditorControl<TRow>(
  batch: Pick<BatchEditingState<TRow>, "draftFor" | "setDraft" | "commit">,
  row: TRow,
  rowId: string,
  columnKey: string,
  editor: CellEditor
): EditorDraftControl {
  return {
    draft: batch.draftFor(row, rowId, columnKey),
    setDraft: (value) => {
      batch.setDraft(row, rowId, columnKey, value);
    },
    onEditorKeyDown: () => undefined,
    commitOnBlur: () => undefined,
    editor,
    selectOptions: editorSelectOptions(editor),
    error: cellFailure(batch.commit, rowId, columnKey),
    validating: batch.commit?.phase === "validating",
  };
}
