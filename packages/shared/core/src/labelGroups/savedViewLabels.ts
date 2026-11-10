/**
 * The strings saved views draw.
 */
import type { TableLabels } from "../types";

/**
 * The strings saved views draw.
 *
 * @public
 */
export const SAVED_VIEW_LABELS: Pick<
  Required<TableLabels>,
  | "savedViews"
  | "saveView"
  | "viewName"
  | "deleteView"
  | "renameView"
  | "moveViewUp"
  | "moveViewDown"
  | "setDefaultView"
  | "defaultViewBadge"
  | "readOnlyViewBadge"
> = {
  savedViews: "Saved views",
  saveView: "Save view",
  viewName: "View name",
  deleteView: "Delete view",
  renameView: "Rename view",
  moveViewUp: "Move view up",
  moveViewDown: "Move view down",
  setDefaultView: "Set as default",
  defaultViewBadge: "Default",
  readOnlyViewBadge: "Read-only",
};
