/**
 * Many rows changed, saved in one go: nothing is sent until the reader says
 * so, and one Cancel puts everything back. The rules live in
 * `@adapttable/core` (`createBatchEditStore`); this hook subscribes to the
 * store.
 */
import {
  type BatchEditingState,
  type BatchRowEdit,
  type EditableColumnLike,
  type FeatureHostState,
} from "@adapttable/core";
import {
  batchEditingView,
  createBatchEditStore,
} from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { EditEventHandler } from "./editingEvents";

export type { BatchEditingState, BatchRowEdit } from "@adapttable/core";

/**
 * What {@link useBatchEditing} needs.
 *
 * @public
 */
export interface UseBatchEditingOptions<TRow> {
  /**
   * Whether batch editing is armed. Off by default: it changes when a commit
   * happens, which is a decision about the data rather than a preference.
   */
  enabled?: boolean;
  /** The columns, for seeding drafts and parsing them back. */
  columns: readonly EditableColumnLike<TRow>[];
  /**
   * Take every pending row at once. The table never writes to a row, and the
   * whole point of the mode is that this is called once.
   */
  onBatchEdit?: (edits: readonly BatchRowEdit<TRow>[]) => unknown;
  /** A row became pending. */
  onEditStart?: EditEventHandler<TRow>;
  /** Pending changes were thrown away. */
  onEditCancel?: EditEventHandler<TRow>;
  /** The host received the batch. */
  onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  featureHost?: FeatureHostState;
}

/**
 * Headless state for changing many rows and saving them together.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseBatchEditingOptions}.
 * @returns The state; inert unless `enabled`.
 *
 * @public
 */
export function useBatchEditing<TRow>(
  options: UseBatchEditingOptions<TRow>
): BatchEditingState<TRow> {
  const [store] = useState(() => createBatchEditStore<TRow>(options));
  store.configure(options);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const { columns, featureHost } = options;
  return useMemo(
    () => batchEditingView(store, snapshot, { columns, featureHost }),
    [store, snapshot, columns, featureHost]
  );
}
