import { defaultLabels, type TableLabels } from "@adapttable/core";

/**
 * English (`en`) label preset.
 *
 * @public
 */
export const en: Required<TableLabels> = {
  ...defaultLabels,
  rowMoveOptions: "Row move options",
  moveToGroup: "Move to group…",
  moveUnder: "Move under…",
  moveToTopLevel: "Move to top level",
  confirmRowMoveTitle: "Confirm row move",
  confirmRowMoveDescription: (row, from, to) =>
    `Move ${row} from ${from} to ${to}?`,
  confirmRowMove: "Move",
  rowMovedToGroup: (group) => `Row moved to ${group}`,
  rowMovedUnder: (parent) => `Row moved under ${parent}`,
  moveRejectedPolicyNever: "Cross-boundary row moves are disabled",
  moveRejectedSorted: "Clear sorting before changing row order",
  moveRejectedCycle: "A row cannot move inside itself or its descendant",
  moveUnavailable: "This row move is not available",
  rootLevel: "Top level",
};
