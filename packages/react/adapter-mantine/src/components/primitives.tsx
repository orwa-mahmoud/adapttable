/**
 * Mantine's primitives — the controls the binding draws features with, in
 * Mantine's own components. A feature picks the size it has always used, so
 * each primitive is made for a size: `button("xs")`, `iconButton("sm")`.
 *
 * Every one hands its props straight to a Mantine component, so each opts out
 * of the compiler: a cache around a pass-through outweighs what it saves.
 */
import type {
  KitButtonProps,
  KitButtonVariant,
  KitCheckboxProps,
  KitIconButtonProps,
  KitPopoverProps,
  KitSelectProps,
  KitTextInputProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Button as MantineButton,
  Checkbox as MantineCheckbox,
  NativeSelect,
  Popover as MantinePopover,
  TextInput as MantineTextInput,
  Tooltip,
} from "@mantine/core";
import type { ReactElement } from "react";

/** The Mantine variant for each emphasis the binding asks for. */
const VARIANT: Readonly<Record<KitButtonVariant, string>> = {
  text: "subtle",
  outlined: "default",
  filled: "filled",
};

/**
 * A captioned button of one Mantine size. Without an emphasis from the
 * binding it is Mantine's `default` variant.
 */
export function button(
  size: "xs" | "compact-xs"
): (props: Readonly<KitButtonProps>) => ReactElement {
  return function Button({
    elementRef,
    variant = "outlined",
    tone,
    justify: _justify,
    ...rest
  }) {
    "use no memo";
    return (
      <MantineButton
        ref={elementRef}
        type="button"
        size={size}
        variant={VARIANT[variant]}
        color={tone === "danger" ? "red" : undefined}
        {...rest}
      />
    );
  };
}

/**
 * A glyph button of one Mantine size: quiet and grey unless the binding asks
 * for an outline, as Mantine's row and header controls are.
 */
export function iconButton(
  size: "sm" | "xl"
): (props: Readonly<KitIconButtonProps>) => ReactElement {
  return function IconButton({
    elementRef,
    variant,
    tone: _tone,
    fullWidth: _fullWidth,
    justify: _justify,
    ...rest
  }) {
    "use no memo";
    const outlined = variant === "outlined";
    return (
      <ActionIcon
        ref={elementRef}
        type="button"
        size={size}
        variant={outlined ? "default" : "subtle"}
        color={outlined ? undefined : "gray"}
        {...rest}
      />
    );
  };
}

/**
 * A quiet glyph button in the theme colour that names itself in a tooltip:
 * the row editor's save and cancel.
 */
export function TooltipIconButton({
  elementRef,
  variant: _variant,
  tone: _tone,
  fullWidth: _fullWidth,
  justify: _justify,
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  return (
    <Tooltip label={rest["aria-label"]} withArrow openDelay={200}>
      <ActionIcon
        ref={elementRef}
        type="button"
        size="sm"
        variant="subtle"
        {...rest}
      />
    </Tooltip>
  );
}

/** A compact text field; `data-*` and `rootPart` land on the input. @public */
export function TextInput({
  value,
  onValueChange,
  rootPart,
  elementRef,
  fullWidth: _fullWidth,
  invalid,
  type = "text",
  ...rest
}: Readonly<KitTextInputProps>) {
  "use no memo";
  return (
    <MantineTextInput
      ref={elementRef}
      size="xs"
      type={type}
      value={value}
      error={invalid}
      data-adapttable-part={rootPart}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      {...rest}
    />
  );
}

/** A compact native select. @public */
export function Select({
  value,
  options,
  onValueChange,
  rootPart,
  fullWidth: _fullWidth,
  label,
  ...rest
}: Readonly<KitSelectProps>) {
  "use no memo";
  return (
    <NativeSelect
      size="xs"
      label={label}
      value={value}
      data-adapttable-part={rootPart}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      data={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      {...rest}
    />
  );
}

/** A compact checkbox with its label. @public */
export function Checkbox({
  checked,
  onCheckedChange,
  ...rest
}: Readonly<KitCheckboxProps>) {
  "use no memo";
  return (
    <MantineCheckbox
      size="xs"
      checked={checked}
      onChange={(event) => onCheckedChange(event.currentTarget.checked)}
      {...rest}
    />
  );
}

/**
 * A floating panel under its trigger. Mantine's target gives the trigger its
 * ref, its ARIA and, while the panel keeps its own state, its click.
 *
 * @public
 */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  role,
  part,
  className,
  style,
  flush,
}: Readonly<KitPopoverProps>) {
  "use no memo";
  return (
    <MantinePopover
      withinPortal
      position="bottom-start"
      shadow="sm"
      opened={open}
      onChange={onOpenChange}
    >
      <MantinePopover.Target refProp="elementRef">
        {trigger({
          elementRef: null,
          onClick: () => onOpenChange?.(open !== true),
          "aria-expanded": open === true,
          "aria-haspopup": role ?? "dialog",
        })}
      </MantinePopover.Target>
      <MantinePopover.Dropdown
        data-adapttable-part={part}
        className={className}
        style={style}
        p={flush ? 0 : "xs"}
      >
        {children}
      </MantinePopover.Dropdown>
    </MantinePopover>
  );
}
