/** The saved-views menu, drawn by the binding with native controls. */
import type { UseSavedViewsOptions } from "@adapttable/react";
import {
  createSavedViewsMenu,
  type KitSavedViewsLook,
  type TableLabels,
} from "@adapttable/react/adapter";
import type { CSSProperties } from "react";

import type { DataTableClassNames } from "../types";
import { ClassNamesProvider, usePartClass } from "./classNamesContext";
import {
  anchoredPopover,
  Button,
  Divider,
  IconButton,
  TextInput,
} from "./partPrimitives";

/**
 * Layout for a panel row: the name/input takes the space, the trailing
 * button keeps its size. The gap is structural — without it the two sit
 * flush, and no class hook can add space a consumer has not asked for.
 */
const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

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
 * Props for the saved-views menu: the views, and what may be done to them.
 *
 * @public
 */
export interface SavedViewsMenuProps {
  /** Wiring for core's `useSavedViews` — storage key, storage, adapter, urlKey. */
  options: UseSavedViewsOptions;
  /** Resolved labels, every key filled. */
  labels: SavedViewsLabels;
  /** Per-part classes. */
  classNames: DataTableClassNames;
}

const LOOK: KitSavedViewsLook = {
  // The wrapper the popover places scrolls; the panel inside only stacks.
  panel: { maxHeight: "none", overflowY: "visible" },
  row: ROW_STYLE,
  divider: {},
  saveRow: ROW_STYLE,
  nameInput: {},
};

const useLook = (): KitSavedViewsLook => LOOK;

const Menu = /* @__PURE__ */ createSavedViewsMenu(
  {
    Button,
    IconButton,
    TextInput,
    Popover: anchoredPopover({ "data-adapttable-part": "views-menu" }),
    Divider,
    usePartClass,
    deleteIcon: "×",
  },
  useLook
);

/**
 * Saved-views popover: a disclosure button + a panel listing the saved views
 * (click applies one and closes; each has a delete button) above a save row
 * that captures the table's CURRENT state under a typed name. Built on core's
 * `useSavedViews`; closes on outside-click or Escape. Ships no styles —
 * target the `data-adapttable-part` hooks or the `views*` className slots.
 *
 * @public
 */
export function SavedViewsMenu({
  options,
  labels,
  classNames,
}: Readonly<SavedViewsMenuProps>) {
  return (
    <ClassNamesProvider classNames={classNames}>
      <Menu options={options} labels={labels} />
    </ClassNamesProvider>
  );
}
