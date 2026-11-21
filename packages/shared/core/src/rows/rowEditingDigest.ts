/**
 * Duck-typed editing snapshot used by row memo digests. The React
 * controller owns the live object; the engine only reads these fields.
 *
 * @public
 */
export interface EditableCellEditing<_TRow = unknown> {
  dirty?: {
    isRowDirty(rowId: string): boolean;
    signature?: string;
    /** A digest of this row's marks; without it the whole digest is read. */
    rowSignature?: (rowId: string) => string;
  };
  state: {
    active?: { rowId: string; columnKey: string } | null;
    draft?: string;
  };
  validation?: {
    rowHasError(rowId: string): boolean;
    isValidating(rowId: string, columnKey: string): boolean | undefined;
    errorFor(rowId: string, columnKey: string): string | undefined;
  };
  saving?: {
    signature?: string;
    /** A digest of this row's saves; without it the whole digest is read. */
    rowSignature?: (rowId: string) => string;
  };
  rowEditing?: { activeRowId?: string; signature?: string };
  batch?: {
    signature?: string;
    /** A digest of this row's drafts; without it the whole digest is read. */
    rowSignature?: (rowId: string) => string;
  };
  conflict?: {
    current?: { rowId: string; columnKey: string; incomingValue: string };
    /**
     * A digest of the cells of THIS row waiting on an answer. A row form and
     * a batch mark several cells at once, and a memoized row that cannot see
     * them never redraws to show the question.
     */
    rowSignature?: (rowId: string) => string;
  };
}
