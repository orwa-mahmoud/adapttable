import {
  type BulkAction,
  type ConfirmHandler,
  type TableLabels,
} from "@adapttable/core";

import type { SelectionState } from "../selection/useSelection";

/**
 * The shared prop surface every adapter's bulk-action bar needs. Extracted
 * so the identical shape isn't re-declared (and flagged as duplication) in
 * each adapter's chrome.
 *
 * @public
 */
export interface BulkBarChromeProps {
  /** Current selection state. */
  selection: SelectionState;
  /**
   * Total rows in the filtered set — drives the "select all N matching"
   * banner when a full page is selected and more rows match elsewhere.
   */
  total: number;
  /** Caller-supplied bulk actions. */
  bulkActions: BulkAction[];
  /** Confirmation handler for actions that declare a `confirm` block. */
  confirm: ConfirmHandler;
  /** Resolved labels. */
  labels: Required<TableLabels>;
}
