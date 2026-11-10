/**
 * The strings find-in-table draws.
 */
import type { TableLabels } from "../types";

/**
 * The strings find-in-table draws.
 *
 * @public
 */
export const FIND_LABELS: Pick<
  Required<TableLabels>,
  | "findInTable"
  | "findPlaceholder"
  | "findMatchCount"
  | "findPrevious"
  | "findNext"
  | "findClose"
> = {
  findInTable: "Find in table",
  findPlaceholder: "Find in table",
  findMatchCount: (current, total) =>
    total === 0 ? "No matches" : `${current} of ${total}`,
  findPrevious: "Previous match",
  findNext: "Next match",
  findClose: "Close find",
};
