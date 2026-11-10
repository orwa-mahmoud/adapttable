/**
 * The strings the context menu and command palette draw.
 */
import type { TableLabels } from "../types";

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
