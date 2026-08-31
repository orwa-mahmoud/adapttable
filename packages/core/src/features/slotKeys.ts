/**
 * The named positions a table asks features to fill.
 *
 * They live apart from every implementation so an adapter's root can name a
 * position without importing what draws there — the same separation that keeps
 * the row-reorder state key away from the reorder hook. This module holds ids
 * and types only; nothing here has a runtime cost worth measuring.
 */
import type { BatchEditBarProps } from "../editing/RowEditGate";
import type { FindBarProps } from "../find/FindBar";
import type { StatusBarChromeProps } from "../focus/StatusBarChrome";
import { featureSlotKey } from "./providers";

/**
 * The status strip, and the selection figures it hosts.
 *
 * ONE element serves two features — `statusBar` asks for the strip and
 * `selectionStats` produces the figures inside it — so the slot is single and
 * both features offer the same renderer.
 *
 * @public
 */
export const STATUS_BAR = featureSlotKey<Omit<StatusBarChromeProps, "slots">>(
  "status-bar",
  { single: true }
);

/**
 * The find bar above the table.
 *
 * @public
 */
export const FIND_BAR = featureSlotKey<FindBarProps>("find-bar", {
  single: true,
});

/**
 * The bar that saves or discards a batch of edits.
 *
 * The row type is erased to `never` because a slot key is one module-level
 * constant serving every table. `BatchEditingState` mentions the row only in
 * parameter positions, so the erasure is sound: any table's state satisfies it.
 *
 * @public
 */
export const BATCH_EDIT_BAR = featureSlotKey<BatchEditBarProps<never>>(
  "batch-edit-bar",
  { single: true }
);
