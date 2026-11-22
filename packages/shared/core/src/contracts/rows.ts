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
 * Merge changes into the row with this id. Absent id: nothing happens. An
 * update keeps the row's id; a `RekeyPatch` changes it.
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
 * Give the row with this id a new id: merge `changes`, which carry the new
 * id. Absent id: nothing happens. A new id another row already holds is
 * refused with `RowIdConflictError` and the row set is left as it was.
 *
 * @public
 */
export interface RekeyPatch<TRow> {
  /** Discriminant for the patch union. */
  type: "rekey";
  /** The row's current id. */
  id: string;
  /** Fields to merge, the new id among them. */
  changes: Partial<TRow>;
}

/**
 * One change to a row set.
 *
 * @public
 */
export type RowPatch<TRow> =
  | InsertPatch<TRow>
  | UpdatePatch<TRow>
  | UpsertPatch<TRow>
  | RemovePatch
  | RekeyPatch<TRow>;

/**
 * How {@link RowPatch}es are read.
 *
 * @public
 */
export interface RowPatchOptions {
  /**
   * Read an update whose changes give the row a new id as a rekey, for
   * patches stored or sent as id-changing updates. Without it, such an
   * update is refused.
   */
  readonly rekeyUpdates?: boolean;
}

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
  | {
      type: "update";
      /** The row's id after the event. */
      id: string;
      /** The id the row had before, when the event rekeyed it. */
      from?: string;
      prev: TRow;
      next: TRow;
      index: number;
    };

/**
 * The result of applying patches, plus the events an incremental view needs
 * so it does not have to diff two 20k-row arrays to find one update.
 *
 * @public
 */
export interface RowPatchLog<TRow> {
  /** The row set after the patches — same contract as `applyRowPatches`. */
  rows: readonly TRow[];
  /** Empty when nothing changed; the original array is then on `rows`. */
  events: readonly RowPatchEvent<TRow>[];
}
