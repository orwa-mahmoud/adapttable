/**
 * The strings find-in-table draws.
 */
import type { TableLabels } from "../types";
import type { FeatureStrings } from "./tableLabels";

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

/**
 * The strings the find bar draws: the base strings and find's own.
 *
 * @public
 */
export type FindStrings = FeatureStrings<readonly [typeof FIND_LABELS]>;
