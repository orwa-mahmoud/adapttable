/**
 * Chakra's Columns menu: the binding's composition, drawn with Chakra's
 * controls on Chakra's spacing.
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
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  Button as ChakraButton,
  Field,
  IconButton as ChakraIconButton,
  Input,
  Popover as ChakraPopover,
  Text as ChakraText,
} from "@chakra-ui/react";
import { forwardRef, type ReactElement } from "react";

import { KitPortal } from "./kitPortal";
import { Divider, Text, TextInput } from "./kitPrimitives";
import { NativeSelect } from "./primitives";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

/** The colour of a filled control: the save button, a pinned column. */
const FILLED = "teal";

/**
 * The menu's buttons, side by side at their own width: the trigger is the
 * one outlined button, at the toolbar's size; the rest are compact and quiet
 * unless filled.
 */
export const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(
    {
      elementRef,
      variant = "text",
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy: _busy,
      ...rest
    },
    ref
  ) {
    "use no memo";
    const trigger = variant === "outlined";
    let look: "ghost" | "outline" | "solid" = "ghost";
    if (trigger) look = "outline";
    else if (variant === "filled") look = "solid";
    return (
      <ChakraButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size={trigger ? "sm" : "xs"}
        variant={look}
        colorPalette={variant === "filled" ? FILLED : undefined}
        {...rest}
      />
    );
  }
);

/** Quiet; a pinned column's pin is filled, an unpinned one grey. */
function IconButton({
  elementRef,
  variant,
  tone,
  fullWidth: _fullWidth,
  justify: _justify,
  busy: _busy,
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  const filled = variant === "filled";
  let color: string | undefined;
  if (filled) color = FILLED;
  else if (tone === "neutral") color = "gray";
  return (
    <ChakraIconButton
      ref={elementRef}
      type="button"
      size="xs"
      variant={filled ? "solid" : "ghost"}
      colorPalette={color}
      {...rest}
    />
  );
}

/** A labelled native choice. */
function Select({
  value,
  options,
  onValueChange,
  rootPart,
  label,
  disabled,
  fullWidth: _fullWidth,
  className,
  style,
  "aria-label": ariaLabel,
}: Readonly<KitSelectProps>) {
  "use no memo";
  return (
    <Field.Root disabled={disabled} className={className} style={style}>
      {label ? <Field.Label fontSize="xs">{label}</Field.Label> : null}
      <NativeSelect
        size="xs"
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        data-adapttable-part={rootPart}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Field.Root>
  );
}

/** The rename field: Chakra's field holds the label, input and error. */
function RenameField({
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
}: Readonly<KitRenameFieldProps>): ReactElement {
  "use no memo";
  return (
    <Field.Root invalid={error !== undefined}>
      <Field.Label
        htmlFor={id}
        data-adapttable-part={parts.label}
        fontSize="xs"
        mb={1}
      >
        {label}
      </Field.Label>
      <Input
        ref={elementRef}
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-adapttable-part={parts.input}
        size="xs"
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {error ? (
        <ChakraText
          id={errorId}
          role="alert"
          data-adapttable-part={parts.error}
          color="red.500"
          fontSize="xs"
          mt={1}
        >
          {error}
        </ChakraText>
      ) : null}
    </Field.Root>
  );
}

const noop = (): void => undefined;

/**
 * The panel under its button's end edge, never flipped. The binding owns
 * Escape, so Escape inside the rename field never closes the whole menu.
 */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  dir,
  "aria-label": label,
}: Readonly<KitPopoverProps>) {
  "use no memo";
  return (
    <ChakraPopover.Root
      open={open}
      onOpenChange={(event) => onOpenChange?.(event.open)}
      closeOnEscape={false}
      positioning={{ placement: "bottom-end", flip: false }}
      lazyMount
    >
      <ChakraPopover.Trigger asChild>
        {/* Chakra toggles from its own trigger props. */}
        {trigger({
          elementRef: noop,
          onClick: noop,
          "aria-expanded": open === true,
          "aria-haspopup": "dialog",
        })}
      </ChakraPopover.Trigger>
      <KitPortal>
        <ChakraPopover.Positioner>
          <ChakraPopover.Content aria-label={label} w="auto" p={0} dir={dir}>
            {children}
          </ChakraPopover.Content>
        </ChakraPopover.Positioner>
      </KitPortal>
    </ChakraPopover.Root>
  );
}

/** Chakra's step of 4 px between the menu's controls. */
const STEP = 4;

/** The gap Chakra's field keeps between its label, input and message. */
const FIELD_GAP = 6;

const LINE = { display: "flex", alignItems: "center", gap: STEP } as const;

const LOOK: KitColumnMenuLook = {
  panel: {
    padding: 2 * STEP,
    minWidth: 260,
    maxHeight: "min(var(--available-height), 70vh, 480px)",
  },
  heading: {
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--chakra-colors-gray-500)",
    paddingInline: STEP,
    paddingBottom: STEP,
  },
  search: { marginBottom: STEP },
  bulk: { ...LINE, marginBottom: STEP },
  row: { ...LINE, paddingBlock: STEP / 2 },
  rowSpacer: { display: "none" },
  grip: {},
  divider: { marginBlock: STEP },
  submenu: {},
  choice: {},
  renameForm: {},
  // Below the field, past the field's own 6 px gap between its parts.
  renameActions: { ...LINE, marginTop: STEP + FIELD_GAP },
  accent: "var(--chakra-colors-blue-500)",
};

const useLook = (): KitColumnMenuLook => LOOK;

/**
 * Column-management popover: per-column drag grip (reorder), eye
 * (show/hide), pin toggle and a list of column actions.
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
