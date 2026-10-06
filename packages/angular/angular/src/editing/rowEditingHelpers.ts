import type { EditableCellEditing } from "@adapttable/angular";
import {
  rowEditingSignature as coreRowEditingSignature,
  rowIsDirty as coreRowIsDirty,
} from "@adapttable/core";

/**
 * Whether a row holds any dirty cell mark.
 *
 * @public
 */
export function rowIsDirty<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): boolean {
  return coreRowIsDirty(
    editing as Parameters<typeof coreRowIsDirty<TRow>>[0],
    rowId
  );
}

/**
 * Signature of a row's editing state for memo comparators.
 *
 * @public
 */
export function rowEditingSignature<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): string | null {
  return coreRowEditingSignature(
    editing as Parameters<typeof coreRowEditingSignature<TRow>>[0],
    rowId
  );
}
