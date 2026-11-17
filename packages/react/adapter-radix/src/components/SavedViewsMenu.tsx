/** The saved-views menu, drawn by the binding with Radix Themes' controls. */
import type { UseSavedViewsOptions } from "@adapttable/react";
import {
  createSavedViewsMenu,
  type KitButtonProps,
  type KitSavedViewsLook,
  mergeRefs,
  type TableLabels,
} from "@adapttable/react/adapter";
import { Button as UiButton } from "@radix-ui/themes";
import { forwardRef, type ReactElement } from "react";

import type { RadixAccentColor } from "../types";
import { AccentColor, useAccentColor } from "./accent";
import { IconButton, panelPopover } from "./ColumnMenu";
import { Divider, TextInput } from "./kitPrimitives";

/** Small × glyph for the per-view delete button. */
function CrossIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

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
  /** Forwarded to core's `useSavedViews` (storage key, adapter, urlKey, …). */
  options: UseSavedViewsOptions;
  /** The four saved-view strings (pass `table.labels` or your own). */
  labels: SavedViewsLabels;
  /** Accent color for the save button. */
  accentColor?: RadixAccentColor;
}

/**
 * The menu's buttons: the trigger outlined at the toolbar's size, each view a
 * quiet compact button filling its row, the save button solid in the accent
 * given to the menu.
 */
const Button = forwardRef<HTMLButtonElement, KitButtonProps>(function Button(
  {
    elementRef,
    variant,
    tone: _tone,
    fullWidth,
    justify,
    busy,
    style,
    ...rest
  },
  ref
) {
  "use no memo";
  const accent = useAccentColor();
  const trigger = variant === "outlined";
  const quiet = variant === "text";
  let look: "outline" | "ghost" | "solid" = "solid";
  if (trigger) look = "outline";
  else if (quiet) look = "ghost";
  return (
    <UiButton
      ref={mergeRefs(ref, elementRef)}
      type="button"
      size={trigger ? "2" : "1"}
      variant={look}
      color={look === "solid" ? accent : undefined}
      loading={busy}
      style={{
        ...(fullWidth ? { flex: 1 } : undefined),
        ...(justify ? { justifyContent: "flex-start" } : undefined),
        ...(look === "solid" ? { flexShrink: 0 } : undefined),
        ...style,
      }}
      {...rest}
    />
  );
});

const ROW = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-1)",
} as const;

const LOOK: KitSavedViewsLook = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
    // The popover scrolls; the panel inside it only stacks.
    maxHeight: "none",
    overflowY: "visible",
  },
  row: ROW,
  divider: { marginBlock: "var(--space-1)" },
  saveRow: ROW,
  nameInput: { flex: 1 },
};

const useLook = (): KitSavedViewsLook => LOOK;

const Menu = /* @__PURE__ */ createSavedViewsMenu(
  {
    Button,
    IconButton,
    TextInput,
    Popover: /* @__PURE__ */ panelPopover({
      minWidth: "240px",
      maxHeight: "min(70vh, 360px)",
    }),
    Divider,
    deleteIcon: <CrossIcon />,
  },
  useLook
);

/**
 * Saved-views toolbar menu on core's `useSavedViews`: a popover listing the
 * captured views (click applies and closes; the trailing × deletes) above a
 * save row that snapshots the table's CURRENT URL state under a typed name.
 *
 * @public
 */
export function SavedViewsMenu({
  accentColor,
  ...props
}: Readonly<SavedViewsMenuProps>): ReactElement {
  "use no memo";
  // The save button takes the accent given here, not the table's.
  return (
    <AccentColor.Provider value={accentColor}>
      <Menu {...props} />
    </AccentColor.Provider>
  );
}
