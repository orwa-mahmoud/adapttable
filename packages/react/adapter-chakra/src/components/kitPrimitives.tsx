/**
 * Chakra's controls for the binding's primitives: every control the binding
 * draws for this kit is one of these, at Chakra's compact `xs` size.
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
  Button as ChakraButton,
  IconButton as ChakraIconButton,
  Input,
  Popover as ChakraPopover,
  Separator,
  Text as ChakraText,
} from "@chakra-ui/react";
import { forwardRef, type ReactElement, useState } from "react";

import { subtleText } from "../styles";
import { KitPortal } from "./kitPortal";
import { Checkbox as ChakraCheckbox, NativeSelect } from "./primitives";

/** Chakra's variant for each emphasis the binding asks for. */
const VARIANT: Readonly<
  Record<KitButtonVariant, "ghost" | "outline" | "solid">
> = {
  text: "ghost",
  outlined: "outline",
  filled: "solid",
};

/**
 * A captioned button of one Chakra size: outlined unless the binding asks
 * otherwise, in the colour `useColor` reads (none by default).
 */
export function buttonOfSize(
  size: "xs" | "sm",
  useColor: () => string | undefined = () => undefined
) {
  return forwardRef<HTMLButtonElement, KitButtonProps>(function Button(
    {
      elementRef,
      variant = "outlined",
      tone,
      fullWidth,
      justify,
      busy,
      ...rest
    },
    ref
  ) {
    const color = useColor();
    return (
      <ChakraButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size={size}
        variant={VARIANT[variant]}
        colorPalette={tone === "danger" ? "red" : color}
        width={fullWidth ? "100%" : undefined}
        justifyContent={justify ? "flex-start" : undefined}
        loading={busy}
        {...rest}
      />
    );
  });
}

/** The kit's compact button. */
export const Button = /* @__PURE__ */ buttonOfSize("xs");

/** A glyph button: quiet unless the binding asks otherwise. */
export const IconButton = forwardRef<HTMLButtonElement, KitIconButtonProps>(
  function IconButton(
    {
      elementRef,
      variant = "text",
      tone,
      fullWidth: _full,
      justify: _j,
      busy,
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <ChakraIconButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="xs"
        variant={VARIANT[variant]}
        colorPalette={tone === "danger" ? "red" : undefined}
        loading={busy}
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
  fullWidth: _full,
  invalid,
  ...rest
}: Readonly<KitTextInputProps>): ReactElement {
  "use no memo";
  return (
    <Input
      ref={elementRef}
      size="xs"
      value={value}
      data-adapttable-part={rootPart}
      aria-invalid={invalid ? "true" : rest["aria-invalid"]}
      onChange={(event) => onValueChange(event.target.value)}
      {...rest}
    />
  );
}

const BLOCK = { display: "block", width: "100%" } as const;

/** A native select, held in a block that takes the host's class. */
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
        size="xs"
        value={value}
        w={fullWidth ? "100%" : undefined}
        data-adapttable-part={rootPart}
        onChange={(event) => onValueChange(event.target.value)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </span>
  );
}

/** A checkbox; a labelled one, in a list, is small. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  ...rest
}: Readonly<KitCheckboxProps>): ReactElement {
  "use no memo";
  return (
    <ChakraCheckbox
      size={label == null ? undefined : "sm"}
      checked={checked}
      onToggle={() => onCheckedChange(!checked)}
      {...rest}
    >
      {label}
    </ChakraCheckbox>
  );
}

const noop = (): void => undefined;

/** An anchored panel under its trigger, portalled in the table's theme. */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  role,
  part,
  className,
  style,
  placement = "bottom-start",
  flush,
  dir,
  "aria-label": ariaLabel,
}: Readonly<KitPopoverProps>): ReactElement {
  const [own, setOwn] = useState(false);
  const shown = open ?? own;
  const setShown = (next: boolean) => {
    if (open === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  return (
    <ChakraPopover.Root
      open={shown}
      onOpenChange={(event) => setShown(event.open)}
      positioning={{ placement }}
      lazyMount
    >
      <ChakraPopover.Trigger asChild>
        {/* Chakra toggles from its own trigger props; the binding's click
            handler has nothing left to do. */}
        {trigger({
          elementRef: noop,
          onClick: noop,
          "aria-expanded": shown,
          "aria-haspopup": role ?? "dialog",
        })}
      </ChakraPopover.Trigger>
      <KitPortal>
        <ChakraPopover.Positioner>
          <ChakraPopover.Content
            width="max-content"
            minWidth="160px"
            p={flush ? 0 : 2}
            dir={dir}
            aria-label={ariaLabel}
            className={className}
            style={style}
            data-adapttable-part={part}
          >
            {children}
          </ChakraPopover.Content>
        </ChakraPopover.Positioner>
      </KitPortal>
    </ChakraPopover.Root>
  );
}

/** Chakra's type for each text role the binding asks for. */
const TEXT_VARIANT = {
  body: { fontSize: "sm" },
  caption: { fontSize: "xs" },
  title: { fontSize: "md", fontWeight: "semibold" },
} as const;

/** Chakra's colour for each text tone. */
const TEXT_TONE = {
  secondary: subtleText,
  disabled: { color: "gray.500" },
  danger: { color: "red.500" },
} as const;

/** Text in Chakra's type: body unless the binding asks otherwise. */
export function Text({
  variant = "body",
  tone,
  ...rest
}: Readonly<KitTextProps>): ReactElement {
  "use no memo";
  return (
    <ChakraText
      {...TEXT_VARIANT[variant]}
      {...(tone ? TEXT_TONE[tone] : undefined)}
      {...rest}
    />
  );
}

/** A horizontal rule. */
export function Divider({ style }: Readonly<KitDividerProps>): ReactElement {
  "use no memo";
  return <Separator style={style} />;
}
