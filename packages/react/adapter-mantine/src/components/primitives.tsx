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
  KitDividerProps,
  KitIconButtonProps,
  KitPopoverProps,
  KitSelectProps,
  KitTextInputProps,
  KitTextProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Button as MantineButton,
  Checkbox as MantineCheckbox,
  Divider as MantineDivider,
  NativeSelect,
  Popover as MantinePopover,
  Text as MantineText,
  TextInput as MantineTextInput,
  Tooltip,
} from "@mantine/core";
import {
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

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
    justify,
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
        justify={justify ? "flex-start" : undefined}
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

const TEXT_SIZE = { body: "sm", title: "sm", caption: "xs" } as const;
const TEXT_COLOR = {
  secondary: "dimmed",
  disabled: "dimmed",
  danger: "red",
} as const;

/** A run of text in one of Mantine's sizes and colours. @public */
export function Text({
  variant = "body",
  tone,
  as,
  color: _color,
  ...rest
}: Readonly<KitTextProps>) {
  "use no memo";
  return (
    <MantineText
      component={as ?? "p"}
      size={TEXT_SIZE[variant]}
      fw={variant === "title" ? 600 : undefined}
      c={tone ? TEXT_COLOR[tone] : undefined}
      {...rest}
    />
  );
}

/** A rule between groups. @public */
export function Divider({ style, ...data }: Readonly<KitDividerProps>) {
  "use no memo";
  return <MantineDivider style={style} {...data} />;
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
  dir,
  "aria-label": label,
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
      <PopoverTarget>
        {trigger({
          elementRef: null,
          onClick: () => onOpenChange?.(open !== true),
          "aria-expanded": open === true,
          "aria-haspopup": role ?? "dialog",
        })}
      </PopoverTarget>
      <MantinePopover.Dropdown
        dir={dir}
        aria-label={label}
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

/**
 * Mantine's popover target for a binding trigger. The target hands the
 * trigger Mantine's ref through `elementRef`, which replaces the trigger's
 * own; passing that one in as the target's `ref` keeps both.
 */
export function PopoverTarget({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  const own = isValidElement<{ elementRef?: Ref<HTMLButtonElement> }>(children)
    ? children.props.elementRef
    : undefined;
  return (
    <MantinePopover.Target refProp="elementRef" ref={own ?? undefined}>
      {children}
    </MantinePopover.Target>
  );
}
