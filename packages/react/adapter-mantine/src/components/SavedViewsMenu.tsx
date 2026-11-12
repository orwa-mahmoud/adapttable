/** The saved-views menu, drawn by the binding with Mantine's controls. */
import type { UseSavedViewsOptions } from "@adapttable/react";
import {
  createSavedViewsMenu,
  type KitButtonProps,
  type KitSavedViewsLook,
  type TableLabels,
} from "@adapttable/react/adapter";
import { Button as MantineButton } from "@mantine/core";
import type { ReactElement } from "react";

import { CloseIcon } from "../icons";
import { Popover } from "./ColumnMenu";
import { Divider, iconButton, TextInput } from "./primitives";

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
  /** Storage + URL backend wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved table labels (trigger, save row, delete action). */
  labels: SavedViewsLabels;
}

/**
 * The menu's buttons: the trigger at Mantine's default size, each view a
 * quiet compact button that fills its row, the save button filled.
 */
function Button({
  elementRef,
  variant,
  tone: _tone,
  fullWidth,
  justify,
  busy: _busy,
  style,
  ...rest
}: Readonly<KitButtonProps>) {
  "use no memo";
  if (variant === "outlined")
    return (
      <MantineButton
        ref={elementRef}
        type="button"
        size="sm"
        variant="default"
        style={style}
        {...rest}
      />
    );
  const quiet = variant === "text";
  return (
    <MantineButton
      ref={elementRef}
      type="button"
      size={quiet ? "compact-sm" : "xs"}
      variant={quiet ? "subtle" : "filled"}
      justify={justify ? "flex-start" : undefined}
      style={fullWidth ? { flex: 1, ...style } : style}
      {...rest}
    />
  );
}

const ROW = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 6,
} as const;

const LOOK: KitSavedViewsLook = {
  panel: { padding: 4, minWidth: 220, maxHeight: "min(70vh, 360px)" },
  row: { ...ROW, padding: "2px 4px" },
  divider: { marginBlock: 4 },
  saveRow: { ...ROW, padding: 4 },
  nameInput: { flex: 1 },
};

const useLook = (): KitSavedViewsLook => LOOK;

/**
 * Saved-views toolbar menu: a popover listing the captured views (click to
 * apply and close, the trailing ✕ to delete it) above a save row that
 * captures the table's CURRENT URL state under the typed name. Pairs with
 * core's `useSavedViews` and composes into the `toolbar` slot — or let
 * `<DataTable savedViews>` mount it for you next to the Columns menu.
 *
 * @public
 */
export const SavedViewsMenu: (
  props: Readonly<SavedViewsMenuProps>
) => ReactElement = /* @__PURE__ */ createSavedViewsMenu(
  {
    Button,
    IconButton: /* @__PURE__ */ iconButton("sm"),
    TextInput,
    Popover,
    Divider,
    deleteIcon: <CloseIcon size={12} />,
  },
  useLook
);
