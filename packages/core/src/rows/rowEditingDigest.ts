/**
 * Duck-typed editing snapshot used by row memo digests. The React
 * controller owns the live object; the engine only reads these fields.
 *
 * @public
 */
export interface EditableCellEditing<_TRow = unknown> {
  dirty?: { isRowDirty(rowId: string): boolean; signature?: string };
  state: {
    active?: { rowId: string; columnKey: string } | null;
    draft?: string;
  };
  validation?: {
    rowHasError(rowId: string): boolean;
    isValidating(rowId: string, columnKey: string): boolean | undefined;
    errorFor(rowId: string, columnKey: string): string | undefined;
  };
  saving?: { signature?: string };
  rowEditing?: { activeRowId?: string; signature?: string };
  batch?: { signature?: string };
  conflict?: {
    current?: { rowId: string; columnKey: string; incomingValue: string };
  };
}
