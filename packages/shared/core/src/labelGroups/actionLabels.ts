/**
 * The strings the context menu and command palette draw.
 */
import type { TableLabels } from "../types";
import type { FeatureStrings } from "./tableLabels";

/**
 * The strings the context menu and command palette draw.
 *
 * @public
 */
export const ACTION_LABELS: Pick<
  Required<TableLabels>,
  "commandSearch" | "commandEmpty" | "copyCells" | "cutCells"
> = {
  commandSearch: "Search commands",
  commandEmpty: "No matching command",
  copyCells: "Copy",
  cutCells: "Cut",
};

/**
 * The strings an action chrome (context menu, command palette) draws: the base strings and the actions' own.
 *
 * @public
 */
export type ActionStrings = FeatureStrings<readonly [typeof ACTION_LABELS]>;
