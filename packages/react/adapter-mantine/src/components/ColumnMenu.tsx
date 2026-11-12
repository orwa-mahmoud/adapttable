/**
 * Mantine's Columns menu: the binding's composition, drawn with Mantine's
 * controls on Mantine's spacing.
 */
import {
  type ColumnMenuSlotProps,
  createColumnMenu,
  type KitButtonProps,
  type KitColumnMenuLook,
  type KitIconButtonProps,
  type KitPopoverProps,
  type KitRenameFieldProps,
  type KitSelectProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Button as MantineButton,
  Popover as MantinePopover,
  Select as MantineSelect,
  TextInput as MantineTextInput,
} from "@mantine/core";

import { Divider, PopoverTarget, Text, TextInput } from "./primitives";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

/**
 * The menu's buttons: its trigger is the one outlined button, at Mantine's
 * default size; the rest are compact, quiet unless filled.
 */
export function Button({
  elementRef,
  variant,
  tone: _tone,
  justify,
  ...rest
}: Readonly<KitButtonProps>) {
  "use no memo";
  const trigger = variant === "outlined";
  return (
    <MantineButton
      ref={elementRef}
      type="button"
      size={trigger ? "sm" : "xs"}
      variant={trigger ? "default" : (variant ?? "subtle")}
      justify={justify ? "flex-start" : undefined}
      {...rest}
    />
  );
}

/** Quiet and grey; light blue while on, filled blue when pinned. */
function IconButton({
  elementRef,
  variant,
  tone,
  fullWidth: _fullWidth,
  justify: _justify,
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  const on = tone === "primary";
  let look = "subtle";
  if (on) look = variant === "filled" ? "filled" : "light";
  return (
    <ActionIcon
      ref={elementRef}
      type="button"
      size="sm"
      variant={look}
      color={on ? "blue" : "gray"}
      {...rest}
    />
  );
}

/** A labelled choice in Mantine's own list, opened inside the panel. */
function Select({
  value,
  options,
  onValueChange,
  rootPart,
  fullWidth: _fullWidth,
  style: _style,
  ...rest
}: Readonly<KitSelectProps>) {
  "use no memo";
  return (
    <MantineSelect
      size="xs"
      value={value}
      allowDeselect={false}
      data-adapttable-part={rootPart}
      data={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      comboboxProps={{ withinPortal: false }}
      onChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
      {...rest}
    />
  );
}

/** The rename field: Mantine's input carries its label and its error. */
export function RenameField({
  id,
  elementRef,
  label,
  value,
  error,
  errorId,
  parts,
  onValueChange,
  onBlur,
  onKeyDown,
}: Readonly<KitRenameFieldProps>) {
  "use no memo";
  return (
    <MantineTextInput
      ref={elementRef}
      id={id}
      size="xs"
      label={label}
      labelProps={{ "data-adapttable-part": parts.label }}
      value={value}
      error={error}
      errorProps={{
        id: errorId,
        role: "alert",
        "data-adapttable-part": parts.error,
      }}
      data-adapttable-part={parts.input}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? errorId : undefined}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}

/**
 * The panel under its button's end edge, never flipped, as tall as the window
 * leaves room for. The binding owns Escape, so the focus inside the rename
 * field never closes the whole menu.
 */
function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  dir,
  "aria-label": label,
}: Readonly<KitPopoverProps>) {
  "use no memo";
  return (
    <MantinePopover
      opened={open}
      onChange={(next) => {
        if (!next) onOpenChange?.(false);
      }}
      position="bottom-end"
      withinPortal
      returnFocus={false}
      closeOnEscape={false}
      zIndex={10050}
      middlewares={{
        flip: false,
        shift: { padding: 8 },
        size: {
          padding: 8,
          apply: ({ availableHeight, elements }) => {
            elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
          },
        },
      }}
    >
      <PopoverTarget>
        {trigger({
          elementRef: null,
          onClick: () => onOpenChange?.(open !== true),
          "aria-expanded": open === true,
          "aria-haspopup": "dialog",
        })}
      </PopoverTarget>
      <MantinePopover.Dropdown
        dir={dir}
        aria-label={label}
        style={{ overflowY: "auto" }}
      >
        {children}
      </MantinePopover.Dropdown>
    </MantinePopover>
  );
}

const LOOK: KitColumnMenuLook = {
  panel: { padding: 4, minWidth: 250, maxHeight: "min(70vh, 480px)" },
  heading: {
    fontWeight: 600,
    textTransform: "uppercase",
    paddingInline: 4,
    paddingBottom: 6,
  },
  search: { marginBottom: 6 },
  bulk: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    paddingInline: 4,
  },
  row: {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    padding: "2px 4px",
  },
  rowSpacer: { width: 22 },
  grip: {},
  divider: { marginBlock: 4 },
  submenu: { padding: "0 4px 4px" },
  choice: {},
  renameForm: { padding: 4 },
  renameActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  accent: "var(--mantine-primary-color-filled)",
};

const useLook = (): KitColumnMenuLook => LOOK;

/**
 * Column-management popover: per-column drag grip (reorder), eye
 * (show/hide), pin toggle and a list of column actions. Keyboard users focus
 * a grip and use the arrow keys.
 */
export const ColumnMenu = /* @__PURE__ */ createColumnMenu(
  {
    Button,
    IconButton,
    TextInput,
    Select,
    Popover,
    Text,
    Divider,
    RenameField,
  },
  useLook
);
