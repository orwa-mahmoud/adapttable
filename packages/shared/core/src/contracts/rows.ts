/**
 * Row patches and the immutable log a view applies.
 *
 * The functions that apply these shapes stay in `rows/patch`, which
 * forwards these names.
 */

/**
 * Insert a row. Without `at`, it goes on the end.
 *
 * @public
 */
export interface InsertPatch<TRow> {
  /** Discriminant for the patch union. */
  type: "insert";
  /** The row to write. */
  row: TRow;
  /** Zero-based position. Clamped into range; negative counts from the end. */
  at?: number;
}

/**
 * Merge changes into the row with this id. Absent id: nothing happens.
 *
 * @public
 */
export interface UpdatePatch<TRow> {
  /** Discriminant for the patch union. */
  type: "update";
  /** Identity of the row to change. */
  id: string;
  /** Fields to merge into that row. */
  changes: Partial<TRow>;
}

/**
 * Replace the row with this id, or append it when it is not there yet.
 *
 * @public
 */
export interface UpsertPatch<TRow> {
  /** Discriminant for the patch union. */
  type: "upsert";
  /** The row to write. */
  row: TRow;
}

/**
 * Drop the row with this id. Absent id: nothing happens.
 *
 * @public
 */
export interface RemovePatch {
  /** Discriminant for the patch union. */
  type: "remove";
  /** Identity of the row to change. */
  id: string;
}

/**
 * One change to a row set.
 *
 * @public
 */
export type RowPatch<TRow> =
  InsertPatch<TRow> | UpdatePatch<TRow> | UpsertPatch<TRow> | RemovePatch;

/**
 * One mutation `applyRowPatchesWithLog` actually performed.
 *
 * Incremental re-evaluation walks this list instead of scanning the row set
 * to find what changed. Indices are taken at the moment the event ran, so a
 * later event sees the array the earlier one left behind.
 *
 * @public
 */
export type RowPatchEvent<TRow> =
  | { type: "insert"; id: string; row: TRow; index: number }
  | { type: "remove"; id: string; row: TRow; index: number }
  | { type: "update"; id: string; prev: TRow; next: TRow; index: number };

/**
 * The result of applying patches, plus the events an incremental view needs
 * so it does not have to diff two 20k-row arrays to find one update.
 *
 * @public
 */
export interface RowPatchLog<TRow> {
  /** The row set after the patches — same contract as {@link applyRowPatches}. */
  rows: readonly TRow[];
  /** Empty when nothing changed; the original array is then on `rows`. */
  events: readonly RowPatchEvent<TRow>[];
}
