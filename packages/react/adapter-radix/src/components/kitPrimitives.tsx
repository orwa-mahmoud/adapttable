/**
 * Radix Themes' controls for the binding's primitives: every control the binding
 * draws for this kit is one of these, at the kit's compact size `1`.
 */
import {
  type KitButtonProps,
  type KitButtonVariant,
  type KitCheckboxProps,
  type KitDividerProps,
  type KitIconButtonProps,
  type KitPopoverProps,
  type KitSelectProps,
  type KitTextInputProps,
  type KitTextProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  Button as UiButton,
  IconButton as UiIconButton,
  Popover as RadixPopover,
  Separator,
  Text as UiText,
  TextField,
} from "@radix-ui/themes";
import { forwardRef, type ReactElement, useState } from "react";

import type { RadixAccentColor } from "../types";
import { usePortalContainer } from "./portalContainer";
import { Checkbox as UiCheckbox, NativeSelect } from "./primitives";

/** The kit's variant for each emphasis the binding asks of a captioned button. */
const BUTTON_VARIANT: Readonly<
  Record<KitButtonVariant, "ghost" | "outline" | "solid">
> = {
  text: "ghost",
  outlined: "outline",
  filled: "solid",
};

/** The kit's variant for each emphasis the binding asks of a glyph button. */
const ICON_VARIANT: Readonly<
  Record<KitButtonVariant, "ghost" | "soft" | "solid">
> = {
  text: "ghost",
  outlined: "soft",
  filled: "solid",
};

/** A danger tone takes the kit's red. */
const toneColor = (tone: KitButtonProps["tone"]) =>
  tone === "danger" ? "red" : undefined;

/** A captioned button: soft unless the binding asks otherwise. */
export const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(
    { elementRef, variant, tone, fullWidth, justify, busy, style, ...rest },
    ref
  ) {
    "use no memo";
    return (
      <UiButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="1"
        variant={variant ? BUTTON_VARIANT[variant] : "soft"}
        color={toneColor(tone)}
        loading={busy}
        style={{
          ...(fullWidth ? { width: "100%" } : undefined),
          ...(justify ? { justifyContent: "flex-start" } : undefined),
          ...style,
        }}
        {...rest}
      />
    );
  }
);

// Radix's `.rt-reset` unsets every property on a button, Chrome's own
// `-webkit-user-drag: element` for [draggable] included, which leaves a drag
// grip impossible to drag with a mouse.
const NATIVE_DRAG = { WebkitUserDrag: "element" } as const;

/**
 * A glyph button in one colour (none for the theme's accent): quiet unless
 * the binding asks otherwise; a drag grip keeps the browser's native drag.
 */
export function iconButtonOf(color: RadixAccentColor | undefined) {
  return forwardRef<HTMLButtonElement, KitIconButtonProps>(function IconButton(
    {
      elementRef,
      variant,
      tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      style,
      ...rest
    },
    ref
  ) {
    "use no memo";
    const grip = rest["data-adapttable-grip"] !== undefined;
    return (
      <UiIconButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="1"
        variant={variant ? ICON_VARIANT[variant] : "ghost"}
        color={toneColor(tone) ?? color}
        disabled={rest.disabled === true || busy === true}
        style={grip ? { ...style, ...NATIVE_DRAG } : style}
        {...rest}
      />
    );
  });
}

/** The kit's glyph button: quiet and grey. */
export const IconButton = /* @__PURE__ */ iconButtonOf("gray");

/** A glyph button in the theme's accent. */
export const AccentIconButton = /* @__PURE__ */ iconButtonOf(undefined);

/** A single-line input; the part lands on the input, which is its root. */
export function TextInput({
  value,
  onValueChange,
  elementRef,
  rootPart,
  fullWidth,
  invalid,
  style,
  ...rest
}: Readonly<KitTextInputProps>): ReactElement {
  "use no memo";
  return (
    <TextField.Root
      ref={elementRef}
      size="1"
      value={value}
      data-adapttable-part={rootPart}
      aria-invalid={invalid ? "true" : rest["aria-invalid"]}
      style={fullWidth ? { width: "100%", ...style } : style}
      onChange={(event) => onValueChange(event.target.value)}
      {...rest}
    />
  );
}

const BLOCK = { display: "block", width: "100%" } as const;

/** The kit's select, held in a block that takes the host's class. */
export function Select({
  value,
  options,
  onValueChange,
  className,
  rootPart,
  fullWidth,
  label: _label,
  style,
  ...rest
}: Readonly<KitSelectProps>): ReactElement {
  "use no memo";
  return (
    <span
      className={className}
      style={fullWidth ? { ...BLOCK, ...style } : style}
    >
      <NativeSelect
        size="1"
        value={value}
        options={options}
        width={fullWidth ? "100%" : undefined}
        data-adapttable-part={rootPart}
        onValueChange={onValueChange}
        {...rest}
      />
    </span>
  );
}

/** A checkbox, with its label beside it when it has one. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  ...rest
}: Readonly<KitCheckboxProps>): ReactElement {
  "use no memo";
  return (
    <UiCheckbox
      size="1"
      checked={checked}
      onToggle={() => onCheckedChange(!checked)}
      {...rest}
    >
      {label}
    </UiCheckbox>
  );
}

/** The kit's type for each text role the binding asks for. */
const TEXT_SIZE = { body: "2", caption: "1", title: "2" } as const;

/** Text in the kit's type: body unless the binding asks otherwise. */
export function Text({
  variant = "body",
  tone,
  as,
  color: _color,
  ...rest
}: Readonly<KitTextProps>): ReactElement {
  "use no memo";
  return (
    <UiText
      as={as}
      size={TEXT_SIZE[variant]}
      weight={variant === "title" ? "bold" : undefined}
      color={tone === "danger" ? "red" : tone && "gray"}
      {...rest}
    />
  );
}

/** A horizontal rule. */
export function Divider({
  style,
  ...data
}: Readonly<KitDividerProps>): ReactElement {
  "use no memo";
  return <Separator size="4" style={style} {...data} />;
}

const noop = (): void => undefined;

/** An anchored panel under its trigger, portalled into the table's theme. */
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
  "aria-label": ariaLabel,
}: Readonly<KitPopoverProps>): ReactElement {
  const portalContainer = usePortalContainer();
  const [own, setOwn] = useState(false);
  const shown = open ?? own;
  return (
    <RadixPopover.Root
      open={shown}
      onOpenChange={(next) => {
        if (open === undefined) setOwn(next);
        onOpenChange?.(next);
      }}
    >
      <RadixPopover.Trigger>
        {/* The kit toggles from its own trigger props; the binding's click
            handler has nothing left to do. */}
        {trigger({
          elementRef: noop,
          onClick: noop,
          "aria-expanded": shown,
          "aria-haspopup": role ?? "dialog",
        })}
      </RadixPopover.Trigger>
      <RadixPopover.Content
        container={portalContainer}
        align="start"
        sideOffset={4}
        dir={dir}
        aria-label={ariaLabel}
        className={className}
        data-adapttable-part={part}
        style={{ minWidth: 160, padding: flush ? 0 : 8, ...style }}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Root>
  );
}
