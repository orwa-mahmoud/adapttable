/**
 * Which control opens a row's form.
 *
 * Row-mode editing ships its own "Edit row" button, and an app with a pencil
 * already in its actions column does not want a second one beside it. An
 * action carrying `editsRow` claims that trigger: the pencil begins the edit,
 * and the built-in control stands down.
 *
 * The rewiring happens here rather than in each adapter's actions cell because
 * the answer depends on one row's edit state — which row is open, and whether
 * the table has a form at all — and a second copy of that reasoning is a
 * second place for it to drift.
 */
import type { RowAction } from "@adapttable/core";

import type { EditableCellEditing } from "./editableCellController";
import type { RowEditConflict } from "./RowEditGate";
import type { RowEditingState } from "./rowEditing";

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
  rowEditing: RowEditingState<TRow> | undefined,
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
 * The incoming-change question for one row, built from the editing bag.
 *
 * The bag every cell already receives carries the conflict state and the
 * localized wording, so each kit reads the answer for its row from the same
 * place rather than assembling it itself.
 *
 * @typeParam TRow - The row type.
 * @param editing - The editing bag, or `undefined` when nothing is armed.
 * @param rowId - The row this control set belongs to.
 * @returns The question, or `undefined` when nothing is being asked.
 *
 * @public
 */
export function rowEditConflict<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): RowEditConflict | undefined {
  const conflict = editing?.conflict;
  if (!conflict) return undefined;
  return { asking: conflict.isRowConflict(rowId) };
}
