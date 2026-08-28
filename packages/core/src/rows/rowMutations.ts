/**
 * Adding, duplicating and deleting rows — the asking, never the data.
 *
 * These three sit at the boundary between the table and the host: the table
 * knows *when* the reader asked (a toolbar control, a row action) and the host
 * knows what a new row IS, what a copy of one means, and whether it may go. So
 * the table asks and the host does the rest — the same one-way flow every other
 * write already follows, which is what keeps a new row an ordinary row: it
 * arrives through the source like all the others, and editing, validation,
 * grouping, the hierarchy and virtualization need to know nothing about it.
 *
 * Duplicate and delete arrive as ordinary {@link RowAction}s, so every kit
 * already renders them — trailing buttons on desktop, card buttons on mobile,
 * hideable and end-pinnable with the actions column, and confirmable through
 * the same dialog a host's own destructive action uses.
 */
import { useMemo } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import type { RowAction, TableLabels } from "../types";

/**
 * How a table asks for a row to be added, copied or removed.
 *
 * @internal
 */
export interface RowMutationHandlers<TRow> {
  /**
   * Add a row. Setting this puts an Add control in the toolbar; the host makes
   * the row and stores it, and it reaches the table through the source like
   * every other row — editable, filterable and countable from the moment it
   * lands, with nothing about it special.
   */
  onAddRow?: () => unknown;
  /**
   * Copy a row. Setting this puts a Duplicate action on every row; what a copy
   * means — which fields carry over, which are reset, what id it gets — is the
   * host's, because only the host knows.
   */
  onDuplicateRow?: (row: TRow) => unknown;
  /**
   * Remove a row. Setting this puts a Delete action on every row, behind a
   * confirmation dialog unless {@link RowMutationHandlers.confirmDeleteRow} is
   * `false`.
   */
  onDeleteRow?: (row: TRow) => unknown;
  /**
   * Delete without asking first. Off by default: a delete is destructive and
   * the table cannot undo it. Hosts whose own UI already confirms — or whose
   * delete is reversible — turn it off.
   */
  confirmDeleteRow?: boolean;
}

/**
 * Row-mutation state: the toolbar's control and the per-row actions.
 *
 * @internal
 */
export interface RowMutationsState<TRow> {
  /** Whether an Add control should render. */
  canAdd: boolean;
  /** Ask for a new row. Inert without `onAddRow`. */
  addRow: () => void;
  /**
   * Duplicate and Delete, in that order — empty when the host wired neither.
   * Appended to the host's own `rowActions`, so a delete stays last.
   */
  actions: readonly RowAction<TRow>[];
}

/**
 * What {@link useRowMutations} needs.
 *
 * @internal
 */
export interface UseRowMutationsOptions<
  TRow,
> extends RowMutationHandlers<TRow> {
  /** Resolved labels, for the action names and the delete dialog. */
  labels: Required<TableLabels>;
}

/**
 * The key of the synthesized duplicate action.
 *
 * @internal
 */
export const DUPLICATE_ROW_ACTION_KEY = "adapttable:duplicate-row";
/**
 * The key of the synthesized delete action.
 *
 * @internal
 */
export const DELETE_ROW_ACTION_KEY = "adapttable:delete-row";

/**
 * Headless add / duplicate / delete wiring.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseRowMutationsOptions}.
 * @returns The state; every action is absent until its handler is wired.
 *
 * @internal
 */
export function useRowMutations<TRow>(
  options: UseRowMutationsOptions<TRow>
): RowMutationsState<TRow> {
  const { onDuplicateRow, onDeleteRow, confirmDeleteRow, labels } = options;

  // Stable identities: a row action list that changes shape every render would
  // defeat the memoized rows the whole body depends on.
  const addRow = useEventCallback(() => {
    options.onAddRow?.();
  });
  const duplicate = useEventCallback((row: TRow) => {
    options.onDuplicateRow?.(row);
  });
  const remove = useEventCallback((row: TRow) => {
    options.onDeleteRow?.(row);
  });

  const canAdd = options.onAddRow !== undefined;
  const canDuplicate = onDuplicateRow !== undefined;
  const canDelete = onDeleteRow !== undefined;
  const confirmDelete = confirmDeleteRow !== false;
  const { duplicateRow, deleteRow, deleteRowConfirm } = labels;

  const actions = useMemo<readonly RowAction<TRow>[]>(() => {
    const built: RowAction<TRow>[] = [];
    if (canDuplicate) {
      built.push({
        key: DUPLICATE_ROW_ACTION_KEY,
        label: duplicateRow,
        onClick: duplicate,
      });
    }
    if (canDelete) {
      built.push({
        key: DELETE_ROW_ACTION_KEY,
        label: deleteRow,
        // The kits' destructive token — the same one a host's own delete uses.
        color: "red",
        onClick: remove,
        confirm: confirmDelete
          ? {
              title: deleteRow,
              message: () => deleteRowConfirm,
              confirmLabel: deleteRow,
              danger: true,
            }
          : undefined,
      });
    }
    return built;
  }, [
    canDuplicate,
    canDelete,
    confirmDelete,
    duplicate,
    remove,
    duplicateRow,
    deleteRow,
    deleteRowConfirm,
  ]);

  return useMemo(
    () => ({ canAdd, addRow, actions }),
    [canAdd, addRow, actions]
  );
}
