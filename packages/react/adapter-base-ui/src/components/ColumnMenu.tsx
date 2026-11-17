/**
 * Base UI's Columns menu: the binding's composition, drawn with Base UI's
 * controls on Base UI's spacing.
 */
import {
  type ColumnMenuSlotProps,
  createColumnMenu,
  type KitButtonProps,
  type KitColumnMenuLook,
  type KitIconButtonProps,
  type KitPopoverProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { type CSSProperties, forwardRef, type ReactElement } from "react";

import { Button as UiButton, IconButton as UiIconButton } from "../ui";
import { Divider, Select, Text, TextInput } from "./kitPrimitives";
import { usePortalContainer } from "./portalContainer";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

/** The rename forms' cancel buttons, soft rather than quiet. */
const CANCEL_PARTS = new Set(["column-rename-cancel", "header-rename-cancel"]);

/**
 * The menu's buttons: the trigger outlined at the toolbar's size, the rest
 * compact, quiet and grey, each at its own width; save is outlined and cancel
 * soft.
 */
export const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(
    {
      elementRef,
      variant,
      tone: _tone,
      fullWidth,
      justify: _justify,
      busy,
      style,
      ...rest
    },
    ref
  ) {
    "use no memo";
    const trigger = variant === "outlined";
    let look: "ghost" | "outline" | "soft" = "ghost";
    if (trigger || variant === "filled") look = "outline";
    else if (CANCEL_PARTS.has(rest["data-adapttable-part"] ?? ""))
      look = "soft";
    return (
      <UiButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size={trigger ? "2" : "1"}
        variant={look}
        color={look === "outline" ? undefined : "gray"}
        loading={busy}
        style={fullWidth ? { alignSelf: "flex-start", ...style } : style}
        {...rest}
      />
    );
  }
);

/** Quiet and grey; a pinned column's pin is solid teal. */
export function IconButton({
  elementRef,
  variant,
  tone: _tone,
  fullWidth: _fullWidth,
  justify: _justify,
  busy: _busy,
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  const filled = variant === "filled";
  return (
    <UiIconButton
      ref={elementRef}
      type="button"
      size="1"
      variant={filled ? "solid" : "ghost"}
      color={filled ? "teal" : "gray"}
      {...rest}
    />
  );
}

const noop = (): void => undefined;

/**
 * A panel under its button's end edge, never flipped, sized by `style`. The
 * binding owns Escape, so Escape inside a field in it never closes the whole
 * panel.
 */
export function panelPopover(
  style: CSSProperties
): (props: Readonly<KitPopoverProps>) => ReactElement {
  return function Popover({
    trigger,
    children,
    open,
    onOpenChange,
    dir,
    "aria-label": label,
  }) {
    const portalContainer = usePortalContainer();
    return (
      <BasePopover.Root
        open={open}
        onOpenChange={(next, details) => {
          if (!next && details.reason === "escape-key") return;
          onOpenChange?.(next);
        }}
      >
        <BasePopover.Trigger
          render={
            trigger({
              elementRef: noop,
              onClick: noop,
              "aria-expanded": open === true,
              "aria-haspopup": "dialog",
            }) as ReactElement
          }
        />
        <BasePopover.Portal container={portalContainer}>
          <BasePopover.Positioner
            className="adapttable-popup-positioner"
            side="bottom"
            align="end"
            sideOffset={8}
            collisionAvoidance={{
              side: "none",
              align: "shift",
              fallbackAxisSide: "none",
            }}
          >
            <BasePopover.Popup
              aria-label={label}
              className="adapttable-popup"
              dir={dir}
              style={style}
            >
              {children}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    );
  };
}

const Popover = /* @__PURE__ */ panelPopover({
  minWidth: "min(260px, calc(100vw - 48px))",
  maxHeight: "min(var(--available-height), 70vh, 480px)",
  overflowY: "auto",
});

/** Base UI's step of 0.25rem between the menu's controls. */
const STEP = "0.25rem";

const ROW = { display: "flex", alignItems: "center", gap: STEP } as const;

const LOOK: KitColumnMenuLook = {
  // The popup scrolls and pads; the panel only stacks.
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: STEP,
    maxHeight: "none",
  },
  heading: {
    fontWeight: 650,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  search: {},
  bulk: { display: "flex", flexWrap: "wrap", gap: STEP },
  row: { ...ROW, padding: "2px 0" },
  fixedRow: ROW,
  rowSpacer: { display: "none" },
  grip: {},
  divider: {},
  submenu: { display: "flex", flexDirection: "column", gap: STEP },
  choice: {},
  renameForm: { display: "flex", flexDirection: "column", gap: 4 },
  renameActions: { display: "flex", gap: STEP },
  accent: "var(--adapttable-accent)",
};

const useLook = (): KitColumnMenuLook => LOOK;

/**
 * Column-management popover: per-column drag grip (reorder), eye
 * (show/hide), pin toggle and a list of column actions.
 */
export const ColumnMenu = /* @__PURE__ */ createColumnMenu(
  { Button, IconButton, TextInput, Select, Popover, Text, Divider },
  useLook
);
