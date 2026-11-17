/**
 * The strings row actions, row reorder and row pinning draw.
 */
import type { TableLabels } from "../types";

/**
 * The strings row actions, row reorder and row pinning draw.
 *
 * @public
 */
export const ROW_LABELS: Pick<
  Required<TableLabels>,
  | "duplicateRow"
  | "deleteRow"
  | "deleteRowConfirm"
  | "moveRowUp"
  | "moveRowDown"
  | "rowLifted"
  | "rowMoved"
  | "rowReorderCancelled"
  | "rowMoveOptions"
  | "moveToGroup"
  | "moveUnder"
  | "moveToTopLevel"
  | "rowMovedToGroup"
  | "rowMovedUnder"
  | "moveRejectedPolicyNever"
  | "moveRejectedSorted"
  | "moveRejectedCycle"
  | "moveUnavailable"
  | "rootLevel"
  | "pinToTop"
  | "pinToBottom"
  | "unpinRow"
> = {
  duplicateRow: "Duplicate row",
  deleteRow: "Delete row",
  deleteRowConfirm: "Delete this row? This cannot be undone.",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: (position) => `Row ${String(position)} lifted`,
  rowMoved: (from, to) => `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
  rowMoveOptions: "Row move options",
  moveToGroup: "Move to group…",
  moveUnder: "Move under…",
  moveToTopLevel: "Move to top level",
  rowMovedToGroup: (group) => `Row moved to ${group}`,
  rowMovedUnder: (parent) => `Row moved under ${parent}`,
  moveRejectedPolicyNever: "Cross-boundary row moves are disabled",
  moveRejectedSorted: "Clear sorting before changing row order",
  moveRejectedCycle: "A row cannot move inside itself or its descendant",
  moveUnavailable: "This row move is not available",
  rootLevel: "Top level",
  pinToTop: "Pin to top",
  pinToBottom: "Pin to bottom",
  unpinRow: "Unpin row",
};
