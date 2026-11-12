/**
 * Base UI's controls for the binding's primitives: every control the binding
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
import { Popover as BasePopover } from "@base-ui/react/popover";
import { forwardRef, type ReactElement, useState } from "react";

import {
  Button as UiButton,
  IconButton as UiIconButton,
  Separator,
  Text as UiText,
  TextField,
} from "../ui";
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

/** A glyph button: quiet unless the binding asks otherwise. */
export const IconButton = forwardRef<HTMLButtonElement, KitIconButtonProps>(
  function IconButton(
    {
      elementRef,
      variant,
      tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <UiIconButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="1"
        variant={variant ? ICON_VARIANT[variant] : "ghost"}
        color={toneColor(tone)}
        disabled={rest.disabled === true || busy === true}
        {...rest}
      />
    );
  }
);

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
export function Divider({ style }: Readonly<KitDividerProps>): ReactElement {
  "use no memo";
  return <Separator style={style} />;
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
    <BasePopover.Root
      open={shown}
      onOpenChange={(next) => {
        if (open === undefined) setOwn(next);
        onOpenChange?.(next);
      }}
    >
      <BasePopover.Trigger
        // The kit toggles from its own trigger props; the binding's click
        // handler has nothing left to do.
        render={
          trigger({
            elementRef: noop,
            onClick: noop,
            "aria-expanded": shown,
            "aria-haspopup": role ?? "dialog",
          }) as ReactElement
        }
      />
      <BasePopover.Portal container={portalContainer}>
        <BasePopover.Positioner side="bottom" align="start" sideOffset={4}>
          <BasePopover.Popup
            dir={dir}
            aria-label={ariaLabel}
            className={className}
            data-adapttable-part={part}
            style={{ minWidth: 160, padding: flush ? 0 : 8, ...style }}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
