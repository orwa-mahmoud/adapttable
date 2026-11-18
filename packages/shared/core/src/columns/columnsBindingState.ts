/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { ColumnLayoutState } from "./columnLayoutModel";

/**
 * State + change handler returned by `useColumnLayoutStorageState`.
 *
 * @public
 */
export interface UseColumnLayoutStorageStateResult {
  /** Current layout — from storage, or the default when storage is empty. */
  layout: ColumnLayoutState;
  /** Persist a new layout. Wire to `onColumnLayoutChange`. */
  onLayoutChange: (next: ColumnLayoutState) => void;
}
