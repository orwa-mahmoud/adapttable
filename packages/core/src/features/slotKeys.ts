/**
 * The named positions a table asks features to fill.
 *
 * They live apart from every implementation so an adapter's root can name a
 * position without importing what draws there — the same separation that keeps
 * the row-reorder state key away from the reorder hook. This module holds ids
 * and types only; nothing here has a runtime cost worth measuring.
 */
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
