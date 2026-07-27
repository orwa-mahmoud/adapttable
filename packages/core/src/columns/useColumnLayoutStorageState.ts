import { useCallback, useEffect, useMemo, useState } from "react";

import { devWarn } from "../utils/devWarn";
import { safeLocalStorage } from "../utils/env";
import { stableKey } from "../utils/stableKey";
import { type ColumnLayoutState, EMPTY_COLUMN_LAYOUT } from "./useColumnLayout";

/** The subset of the Web `Storage` API the hook needs (injectable for tests). */
export type LayoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Options for {@link useColumnLayoutStorageState}. */
export interface UseColumnLayoutStorageStateOptions {
  /** Storage key for this table's layout, e.g. `"people-table-columns"`. */
  storageKey: string;
  /** Storage backend. Defaults to `localStorage`; memory-only under SSR. */
  storage?: LayoutStorage;
  /** Layout applied when storage carries no saved layout yet. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
}

/** State + change handler returned by {@link useColumnLayoutStorageState}. */
export interface UseColumnLayoutStorageStateResult {
  /** Current layout — from storage, or the default when storage is empty. */
  layout: ColumnLayoutState;
  /** Persist a new layout. Wire to `onColumnLayoutChange`. */
  onLayoutChange: (next: ColumnLayoutState) => void;
}

/** Keep only string entries of a (possibly hostile) stored array. */
function stringEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/** A non-null, non-array object — the only shape worth field-scanning. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keep only valid pin sides of a (possibly hostile) stored record. */
function sanitizePinned(value: unknown): Record<string, "start" | "end"> {
  const pinned: Record<string, "start" | "end"> = {};
  if (!isPlainRecord(value)) return pinned;
  for (const [key, side] of Object.entries(value)) {
    if (side === "start" || side === "end") pinned[key] = side;
  }
  return pinned;
}

/** Keep only finite positive widths of a (possibly hostile) stored record. */
function sanitizeWidths(value: unknown): Record<string, number> {
  const widths: Record<string, number> = {};
  if (!isPlainRecord(value)) return widths;
  for (const [key, px] of Object.entries(value)) {
    if (typeof px === "number" && Number.isFinite(px) && px > 0) {
      widths[key] = px;
    }
  }
  return widths;
}

/**
 * Validate a parsed storage payload into a {@link ColumnLayoutState}.
 * Persisted data is external input — hand-edited or written by another
 * app version — so every field is checked; anything malformed is dropped
 * rather than crashing the table. Returns `null` when the payload is not
 * even an object.
 */
function sanitizeStoredLayout(parsed: unknown): ColumnLayoutState | null {
  if (!isPlainRecord(parsed)) return null;
  return {
    hidden: stringEntries(parsed.hidden),
    order: stringEntries(parsed.order),
    pinned: sanitizePinned(parsed.pinned),
    widths: sanitizeWidths(parsed.widths),
  };
}

function readStored(
  storage: LayoutStorage | undefined,
  storageKey: string
): ColumnLayoutState | null {
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return null;
    const sanitized = sanitizeStoredLayout(JSON.parse(raw));
    if (sanitized === null) {
      devWarn(
        `stored column layout under "${storageKey}" is not a layout object — ignoring it.`
      );
    }
    return sanitized;
  } catch {
    // Corrupted/inaccessible storage (private mode, quota) → just fall back.
    return null;
  }
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
    const stored = readStored(storage, storageKey);
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
