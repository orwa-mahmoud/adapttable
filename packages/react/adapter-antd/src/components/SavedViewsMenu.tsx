/** The saved-views menu, drawn by the binding with antd's controls. */
import type { UseSavedViewsOptions } from "@adapttable/react";
import {
  createSavedViewsMenu,
  type Direction,
  type KitPopoverProps,
  type KitSavedViewsLook,
  type TableLabels,
} from "@adapttable/react/adapter";
import { createContext, type CSSProperties, useContext } from "react";

import { Button, Divider, IconButton, panelPopover } from "./ColumnMenu";
import { TextInput } from "./kitPrimitives";

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
 * Props for {@link SavedViewsMenu}.
 *
 * @public
 */
export interface SavedViewsMenuProps {
  /** Storage + URL wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved labels. */
  labels: SavedViewsLabels;
  /** Writing direction, so the overlay opens on the correct side. */
  dir?: Direction;
}

/** The writing direction a standalone menu was given. */
const MenuDir = /* @__PURE__ */ createContext<Direction | undefined>(undefined);

const ViewsPopover = /* @__PURE__ */ panelPopover(false);

/** antd's popover, on the side the menu's direction asks for. */
function Popover(props: Readonly<KitPopoverProps>) {
  "use no memo";
  const dir = useContext(MenuDir);
  return <ViewsPopover {...props} dir={props.dir ?? dir} />;
}

const ROW: CSSProperties = { display: "flex", alignItems: "center", gap: 4 };

const LOOK: KitSavedViewsLook = {
  panel: {
    padding: 8,
    minWidth: "min(240px, calc(100vw - 48px))",
    maxHeight: "min(70vh, 360px)",
  },
  row: ROW,
  divider: { margin: "8px 0" },
  saveRow: ROW,
  // The input's intrinsic size would set the panel wider than a phone.
  nameInput: { flex: "1 1 10rem", width: "10rem", minWidth: 0 },
};

const useLook = (): KitSavedViewsLook => LOOK;

const Menu = /* @__PURE__ */ createSavedViewsMenu(
  {
    Button,
    IconButton,
    TextInput,
    Popover,
    Divider,
    deleteIcon: <span aria-hidden="true">×</span>,
  },
  useLook
);

/**
 * AntD saved-views popover on core's headless `useSavedViews`: a list of
 * captured views (click re-applies one to the table's URL state, a trailing
 * button deletes it) plus a name-input row that saves the table's CURRENT
 * state. Escape closes it and returns focus to its button.
 *
 * @public
 */
export function SavedViewsMenu({
  options,
  labels,
  dir,
}: Readonly<SavedViewsMenuProps>) {
  return (
    <MenuDir.Provider value={dir}>
      <Menu options={options} labels={labels} />
    </MenuDir.Provider>
  );
}
