import {
  type LayoutStorage,
  readStoredColumnLayout,
  safeLocalStorage,
  stableKey,
} from "@adapttable/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { type ColumnLayoutState, EMPTY_COLUMN_LAYOUT } from "./useColumnLayout";

export type { LayoutStorage } from "@adapttable/core";

/**
 * Options for {@link useColumnLayoutStorageState}.
 *
 * @public
 */
export interface UseColumnLayoutStorageStateOptions {
  /** Storage key for this table's layout, e.g. `"people-table-columns"`. */
  storageKey: string;
  /** Storage backend. Defaults to `localStorage`; memory-only under SSR. */
  storage?: LayoutStorage;
  /** Layout applied when storage carries no saved layout yet. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
}

/**
 * State + change handler returned by {@link useColumnLayoutStorageState}.
 *
 * @public
 */
export interface UseColumnLayoutStorageStateResult {
  /** Current layout — from storage, or the default when storage is empty. */
  layout: ColumnLayoutState;
  /** Persist a new layout. Wire to `onColumnLayoutChange`. */
  onLayoutChange: (next: ColumnLayoutState) => void;
}

/**
 * Column layout persisted to `localStorage` (or any injected storage) — the
 * "user preference" counterpart to {@link useColumnLayoutUrlState}'s
 * shareable links. A layout set back to the exact default removes the stored
 * entry, so defaults can evolve in later releases. SSR-safe: without a
 * browser the layout stays in memory for that render.
 *
 * ```tsx
 * const { layout, onLayoutChange } = useColumnLayoutStorageState({
 *   storageKey: "people-table-columns",
 * });
 * <DataTable columnLayout={layout} onColumnLayoutChange={onLayoutChange} … />
 * ```
 *
 * @param options - See {@link UseColumnLayoutStorageStateOptions}.
 * @returns The current layout and a change handler that persists it.
 *
 * @public
 */
export function useColumnLayoutStorageState(
  options: UseColumnLayoutStorageStateOptions
): UseColumnLayoutStorageStateResult {
  const { storageKey, defaultColumnLayout } = options;
  const baseLayout = defaultColumnLayout;
  const storage = options.storage ?? safeLocalStorage();

  const fallback = useMemo<ColumnLayoutState>(
    () => ({ ...EMPTY_COLUMN_LAYOUT, ...baseLayout }),
    [baseLayout]
  );
  // Start from the default and hydrate from storage AFTER mount: reading
  // storage in the initializer made the client's first render differ from
  // the server's whenever a layout was saved (hydration mismatch).
  const [layout, setLayout] = useState<ColumnLayoutState>(fallback);
  useEffect(() => {
    const stored = readStoredColumnLayout(storage, storageKey);
    if (stored !== null) setLayout(stored);
    // `storage` is module-stable (localStorage) or caller-provided.
  }, [storage, storageKey]);

  const onLayoutChange = useCallback(
    (next: ColumnLayoutState) => {
      setLayout(next);
      try {
        if (stableKey(next) === stableKey(fallback)) {
          storage?.removeItem(storageKey);
        } else {
          storage?.setItem(storageKey, JSON.stringify(next));
        }
      } catch {
        // Storage write failed (quota/private mode) — state still updates.
      }
    },
    [storage, storageKey, fallback]
  );

  return { layout, onLayoutChange };
}
