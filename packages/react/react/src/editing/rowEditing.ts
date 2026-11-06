/**
 * Editing a whole row at once: every field's draft is held until the reader
 * saves, then the host gets ONE patch. The rules live in `@adapttable/core`
 * (`createRowEditStore`); this hook subscribes to the store.
 */
import {
  type EditableColumnLike,
  type FeatureHostState,
  type RowEditingState,
} from "@adapttable/core";
import { createRowEditStore, rowEditingView } from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { EditEventHandler } from "./editingEvents";

export type { RowEditDrafts, RowEditingState } from "@adapttable/core";

/**
 * What {@link useRowEditing} needs.
 *
 * @public
 */
export interface UseRowEditingOptions<TRow> {
  /**
   * Whether row editing is armed. Off by default: it changes the commit unit,
   * which is a decision about the data, not a preference.
   */
  enabled?: boolean;
  /** The columns, for seeding drafts and parsing them back. */
  columns: readonly EditableColumnLike<TRow>[];
  /**
   * Take everything the reader changed, as one patch of parsed values keyed by
   * column. The table never writes to a row.
   */
  onRowEdit?: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown;
  /** An editor opened on this row. */
  onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the drafts away. */
  onEditCancel?: EditEventHandler<TRow>;
  /** The host received the patch. */
  onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  featureHost?: FeatureHostState;
}

/**
 * Headless state for editing a row as one unit.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseRowEditingOptions}.
 * @returns The state; inert unless `enabled`.
 *
 * @public
 */
export function useRowEditing<TRow>(
  options: UseRowEditingOptions<TRow>
): RowEditingState<TRow> {
  const [store] = useState(() => createRowEditStore<TRow>(options));
  store.configure(options);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const { featureHost } = options;
  return useMemo(
    () => rowEditingView(store, snapshot, featureHost),
    [store, snapshot, featureHost]
  );
}
