/**
 * The per-cell editing controller. The commit pipeline — validation, the hold
 * while an async check decides, the stale-result guard, the send to the host,
 * dirty marks and the step to the next cell — lives in `@adapttable/core`
 * (`editableCellController`); this file binds it to React's column type and
 * the bundle the chrome hands every cell.
 */
import {
  type EditableCellController,
  type EditingBundle,
  rowEditingSignature as coreRowEditingSignature,
  rowIsDirty as coreRowIsDirty,
} from "@adapttable/core";
import { editableCellController as coreEditableCellController } from "@adapttable/core/editing";

import type { ColumnDef } from "../columnDef";
import type { RowEditIcons } from "./RowEditGate";

export type {
  EditableCellController,
  EditableCellMode,
} from "@adapttable/core";
export {
  focusEditorOnMount,
  stopCellEditKeyboard,
} from "@adapttable/core/editing";

/**
 * Opt-in editing bundle from {@link TableChrome.editing}.
 *
 * @public
 */
export interface EditableCellEditing<TRow> extends EditingBundle<TRow> {
  /** Glyph overrides for the row-mode controls, when the host set any. */
  rowEditIcons?: RowEditIcons;
}

/** @public */
export function rowIsDirty<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): boolean {
  return coreRowIsDirty(
    editing as Parameters<typeof coreRowIsDirty<TRow>>[0],
    rowId
  );
}

/** @public */
export function rowEditingSignature<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): string | null {
  return coreRowEditingSignature(
    editing as Parameters<typeof coreRowEditingSignature<TRow>>[0],
    rowId
  );
}

/**
 * Derive the per-cell editing controller. When `editing` is omitted (host
 * did not pass `onCellEdit`), always returns `mode: "display"` — zero UI
 * change for tables that never opted in.
 *
 * @public
 */
export function editableCellController<TRow>(options: {
  editing: EditableCellEditing<TRow> | undefined;
  row: TRow;
  column: ColumnDef<TRow>;
  rowId: string;
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  rowKey: (row: TRow) => string;
}): EditableCellController {
  return coreEditableCellController(options);
}
