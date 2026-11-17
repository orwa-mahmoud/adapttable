/** The saved-views menu, drawn by the binding with MUI's controls. */
import type { UseSavedViewsOptions } from "@adapttable/react";
import {
  createSavedViewsMenu,
  type KitSavedViewsLook,
  type TableLabels,
} from "@adapttable/react/adapter";
import type { ReactElement } from "react";

import { Button, Divider, IconButton, Popover, TextInput } from "./primitives";

/**
 * The label strings the saved-views menu renders.
 *
 * @public
 */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

/**
 * Props for the saved-views menu.
 *
 * @public
 */
export interface SavedViewsMenuProps {
  /** Storage + URL backend wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved table labels (trigger, save row, delete action). */
  labels: SavedViewsLabels;
}

/** MUI's half spacing step between the menu's controls. */
const STEP = 4;

const ROW = { display: "flex", alignItems: "center", gap: STEP } as const;

const LOOK: KitSavedViewsLook = {
  panel: { padding: 6, minWidth: 250 },
  row: ROW,
  divider: { margin: `${STEP}px 0` },
  saveRow: ROW,
  nameInput: {},
};

const useLook = (): KitSavedViewsLook => LOOK;

/**
 * MUI saved-views menu: a toolbar button opening a popover that lists the
 * saved views — click applies one and closes, the trailing × deletes it —
 * above a save row that captures the table's CURRENT URL state (search,
 * sort, page, filters, column layout) under a typed name.
 *
 * @public
 */
export const SavedViewsMenu: (
  props: Readonly<SavedViewsMenuProps>
) => ReactElement = /* @__PURE__ */ createSavedViewsMenu(
  { Button, IconButton, TextInput, Popover, Divider, deleteIcon: "×" },
  useLook
);
