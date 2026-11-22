/**
 * Which cells have been changed since the reader last saw them agree with the
 * server. The rules live in `@adapttable/core` (`createDirtyCellStore`); this
 * hook subscribes to the store.
 */
import { type DirtyCellState } from "@adapttable/core";
import { createDirtyCellStore, dirtyCellView } from "@adapttable/core/editing";
import { useContext, useMemo, useState, useSyncExternalStore } from "react";

import { useRowRekeyMoves } from "../hooks/useRowRekeyMoves";
import { TableStoreContext } from "../state/tableStoreContext";

export type { DirtyCellState } from "@adapttable/core";

/**
 * What `useDirtyCells` needs.
 *
 * @public
 */
export interface UseDirtyCellsOptions {
  /**
   * Whether to mark at all. Off by default: a mark is a claim about what the
   * server has agreed to, and a table whose host never says would be guessing.
   */
  enabled?: boolean;
}

/**
 * Headless dirty-cell state for inline editing.
 *
 * @param options - See `UseDirtyCellsOptions`.
 * @returns The state; inert unless `enabled`.
 *
 * @public
 */
export function useDirtyCells(
  options: UseDirtyCellsOptions = {}
): DirtyCellState {
  const table = useContext(TableStoreContext);
  const [store] = useState(() =>
    createDirtyCellStore(options, { store: table })
  );
  store.configure(options);
  useRowRekeyMoves(store);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return useMemo(() => dirtyCellView(store, snapshot), [store, snapshot]);
}
