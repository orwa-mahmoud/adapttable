/**
 * Radix's Columns menu: the binding's composition, drawn with Radix Themes'
 * controls on Radix's spacing.
 */
import {
  type ColumnMenuSlotProps,
  createColumnMenu,
  type KitButtonProps,
  type KitColumnMenuLook,
  type KitIconButtonProps,
  type KitPopoverProps,
  type KitSelectProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  Button as UiButton,
  Flex,
  IconButton as UiIconButton,
  Popover as RadixPopover,
  Text as UiText,
} from "@radix-ui/themes";
import { type CSSProperties, forwardRef, type ReactElement } from "react";

import { Divider, Text, TextInput } from "./kitPrimitives";
import { PortalContainerProvider, usePortalContainer } from "./portalContainer";
import { NativeSelect } from "./primitives";

/** The shared Columns-menu contract, plus where the menu portals. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow> & {
  /** Fullscreen-safe target for the popover and nested choices. */
  container?: HTMLElement;
};

/** The rename forms' cancel buttons, soft rather than quiet. */
const CANCEL_PARTS = new Set(["column-rename-cancel", "header-rename-cancel"]);

/**
 * The menu's buttons: the trigger outlined at the toolbar's size, the rest
 * compact, quiet and grey, each at its own width; save is solid and cancel
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
    let look: "ghost" | "outline" | "soft" | "solid" = "ghost";
    if (trigger) look = "outline";
    else if (variant === "filled") look = "solid";
    else if (CANCEL_PARTS.has(rest["data-adapttable-part"] ?? ""))
      look = "soft";
    return (
      <UiButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size={trigger ? "2" : "1"}
        variant={look}
        color={look === "ghost" || look === "soft" ? "gray" : undefined}
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
 * A panel under its button's end edge, sized by `style`. Collision handling
 * stays on: a panel wider than the space beside its trigger otherwise runs off
 * the edge on a narrow viewport. The binding owns Escape, so Escape inside a
 * field in it never closes the whole panel.
 */
export function panelPopover(
  size: Readonly<{ minWidth: string; maxHeight: string }>
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
      <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
        <RadixPopover.Trigger>
          {trigger({
            elementRef: noop,
            onClick: noop,
            "aria-expanded": open === true,
            "aria-haspopup": "dialog",
          })}
        </RadixPopover.Trigger>
        <RadixPopover.Content
          container={portalContainer}
          aria-label={label}
          align="end"
          side="bottom"
          minWidth={size.minWidth}
          maxHeight={size.maxHeight}
          dir={dir}
          style={PANEL_SCROLL}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Root>
    );
  };
}

const PANEL_SCROLL: CSSProperties = { overflowY: "auto", zIndex: 10050 };

/** A choice among a column's actions, captioned above its select. */
function Select({
  value,
  options,
  onValueChange,
  rootPart,
  label,
  disabled,
  dir,
  "aria-label": ariaLabel,
}: Readonly<KitSelectProps & { dir?: "ltr" | "rtl" }>) {
  "use no memo";
  return (
    <Flex direction="column" gap="1" data-adapttable-part={rootPart}>
      <UiText as="span" size="1" color="gray">
        {label}
      </UiText>
      <NativeSelect
        size="1"
        aria-label={ariaLabel}
        value={value}
        options={options}
        disabled={disabled}
        dir={dir}
        container={usePortalContainer()}
        width="100%"
        onValueChange={onValueChange}
      />
    </Flex>
  );
}

const Popover = /* @__PURE__ */ panelPopover({
  minWidth: "260px",
  maxHeight:
    "min(70vh, 480px, calc(var(--radix-popper-available-height) - 8px))",
});

/** Radix's first spacing step between the menu's controls. */
const STEP = "var(--space-1)";

const ROW = { display: "flex", alignItems: "center", gap: STEP } as const;

const LOOK: KitColumnMenuLook = {
  // The popup scrolls and pads; the panel only stacks.
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: STEP,
    // The popover scrolls; the panel inside it only stacks.
    maxHeight: "none",
    overflowY: "visible",
  },
  heading: {
    fontWeight: "var(--font-weight-bold)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  search: {},
  bulk: { display: "flex", flexWrap: "wrap", gap: STEP },
  row: { ...ROW, padding: "2px 0" },
  fixedRow: ROW,
  rowSpacer: { display: "none" },
  grip: {},
  divider: { marginBlock: "var(--space-1)" },
  submenu: { display: "flex", flexDirection: "column", gap: STEP },
  choice: {},
  renameForm: { display: "flex", flexDirection: "column", gap: 4 },
  renameActions: { display: "flex", gap: STEP },
  accent: "var(--accent-9)",
};

const useLook = (): KitColumnMenuLook => LOOK;

const Menu = /* @__PURE__ */ createColumnMenu(
  { Button, IconButton, TextInput, Select, Popover, Text, Divider },
  useLook
);

/**
 * Column-management popover: per-column drag grip (reorder), eye
 * (show/hide), pin toggle and a list of column actions.
 */
export function ColumnMenu<TRow>({
  container,
  ...props
}: Readonly<ColumnMenuProps<TRow>>): ReactElement {
  "use no memo";
  const outer = usePortalContainer();
  return (
    <PortalContainerProvider value={container ?? outer}>
      <Menu {...props} />
    </PortalContainerProvider>
  );
}
