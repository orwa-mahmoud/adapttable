/** The saved-views menu, drawn by the binding with Chakra's controls. */
import type { UseSavedViewsOptions } from "@adapttable/react";
import {
  createSavedViewsMenu,
  type KitButtonProps,
  type KitSavedViewsLook,
  mergeRefs,
  type TableLabels,
} from "@adapttable/react/adapter";
import { Button as ChakraButton } from "@chakra-ui/react";
import { forwardRef, type ReactElement } from "react";

import { AccentColor, useAccentColor } from "./accent";
import { Button as MenuButton, Popover } from "./ColumnMenu";
import { Divider, IconButton, TextInput } from "./kitPrimitives";

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
  /** Chakra color scheme for the save button. */
  accentColor?: string;
}

/**
 * The menu's buttons: the trigger as the toolbar's, each view a quiet compact
 * button that fills its row, the save button solid in the table's accent.
 */
const Button = forwardRef<HTMLButtonElement, KitButtonProps>(function Button(
  {
    elementRef,
    variant,
    tone: _tone,
    fullWidth,
    justify,
    busy: _busy,
    ...rest
  },
  ref
) {
  "use no memo";
  const accent = useAccentColor();
  if (variant === "outlined")
    return (
      <MenuButton
        ref={ref}
        elementRef={elementRef}
        variant={variant}
        {...rest}
      />
    );
  const quiet = variant === "text";
  return (
    <ChakraButton
      ref={mergeRefs(ref, elementRef)}
      type="button"
      size="xs"
      variant={quiet ? "ghost" : "solid"}
      colorPalette={quiet ? undefined : accent}
      fontWeight={quiet ? "normal" : undefined}
      flex={fullWidth ? 1 : undefined}
      flexShrink={quiet ? undefined : 0}
      justifyContent={justify ? "flex-start" : undefined}
      {...rest}
    />
  );
});

/** Chakra's step of 4 px between the menu's controls. */
const STEP = 4;

const ROW = { display: "flex", alignItems: "center", gap: STEP } as const;

const LOOK: KitSavedViewsLook = {
  panel: { padding: 2 * STEP, minWidth: 240, maxHeight: "min(70vh, 360px)" },
  row: { ...ROW, paddingBlock: STEP / 2 },
  divider: { marginBlock: STEP },
  saveRow: ROW,
  nameInput: {},
};

const useLook = (): KitSavedViewsLook => LOOK;

const Menu = /* @__PURE__ */ createSavedViewsMenu(
  {
    Button,
    IconButton,
    TextInput,
    Popover,
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
