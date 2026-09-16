import {
  Checkbox as ChakraCheckbox,
  Field as ChakraField,
  NativeSelect as ChakraNativeSelect,
  Tooltip as ChakraTooltip,
} from "@chakra-ui/react";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { KitPortal } from "./kitPortal";

/**
 * Checkbox wrapper recomposing Chakra v3's compound `Checkbox.*` into the v2
 * single-component API the adapter relied on: a `checked` / `indeterminate`
 * controlled state, a `toggle` callback fired on change, and an optional
 * label (`children`). The hidden input keeps native a11y; `aria-label`
 * lands on the root (so an unlabelled selection box still names itself).
 */
export function Checkbox({
  checked,
  indeterminate,
  onToggle,
  size,
  colorPalette,
  id,
  value,
  mb,
  className,
  inputRef,
  onKeyDown,
  "aria-label": ariaLabel,
  "data-adapttable-part": dataPart,
  children,
  ...rest
}: Readonly<{
  checked: boolean;
  indeterminate?: boolean;
  onToggle?: () => void;
  size?: "sm" | "md" | "lg";
  colorPalette?: string;
  id?: string;
  value?: string;
  mb?: number;
  className?: string;
  /** Hands the real input out, so a cell editor can take focus on mount. */
  inputRef?: (node: HTMLInputElement | null) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  "aria-label"?: string;
  "data-adapttable-part"?: string;
  children?: ReactNode;
  /** Validation and busy state from the headless layer. */
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-busy"?: true;
  "data-conflict"?: "";
}>) {
  return (
    <ChakraCheckbox.Root
      id={id}
      value={value}
      size={size}
      colorPalette={colorPalette}
      mb={mb}
      className={className}
      data-adapttable-part={dataPart}
      checked={indeterminate ? "indeterminate" : checked}
    >
      {/* The accessible name lives on the real (hidden) input so the
          `checkbox` role element is the named, toggle-able target — matching
          the v2 single-input contract `getByLabelText` / role queries rely on.
          The toggle is driven off the input's `onClick` (not `onChange`):
          Ark sets the input's `checked` imperatively, which desyncs React's
          change-event value tracker, so `onChange` can silently no-op after an
          out-of-band selection change — `onClick` always fires once per click. */}
      <ChakraCheckbox.HiddenInput
        ref={inputRef}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        onClick={onToggle ? () => onToggle() : undefined}
        {...rest}
      />
      <ChakraCheckbox.Control />
      {children != null && (
        <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label>
      )}
    </ChakraCheckbox.Root>
  );
}

/**
 * Tooltip wrapper recomposing Chakra v3's compound `Tooltip.*` into the v2
 * single-component API the adapter relied on: a `label` plus a single trigger
 * child. `disabled` suppresses the tip entirely (v2's `isDisabled`), so a
 * disabled action with no reason still renders its trigger untouched.
 */
export function Tooltip({
  label,
  disabled,
  children,
}: Readonly<{
  label: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}>) {
  if (disabled || label === "" || label == null) return <>{children}</>;
  return (
    <ChakraTooltip.Root>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <KitPortal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content>{label}</ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </KitPortal>
    </ChakraTooltip.Root>
  );
}

/**
 * Native `<select>` recomposing Chakra v3's `NativeSelect.*` compound into the
 * v2 single-`Select` API: width / size / flex sizing on the root, the real
 * `<select>` (value, onChange, placeholder, `<option>` children) on the field.
 * v3 positions the chevron with logical `insetEnd` / `pe`, so it flips for RTL
 * from the ambient `dir` automatically — the v2 manual icon re-pin is gone.
 */
export function NativeSelect({
  size,
  value,
  placeholder,
  multiple,
  onChange,
  onKeyDown,
  onBlur,
  fieldRef,
  flex,
  w,
  minW,
  minH,
  maxW,
  className,
  "aria-label": ariaLabel,
  "data-adapttable-part": dataPart,
  children,
  ...rest
}: Readonly<{
  size?: "xs" | "sm" | "md" | "lg";
  value?: string | number | readonly string[];
  placeholder?: string;
  /** Renders `<select multiple>` — a list box rather than a dropdown. */
  multiple?: boolean;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLSelectElement>) => void;
  onBlur?: (event: FocusEvent<HTMLSelectElement>) => void;
  fieldRef?: (node: HTMLSelectElement | null) => void;
  flex?: string;
  w?: string;
  minW?: string;
  minH?: string;
  maxW?: string;
  className?: string;
  "aria-label"?: string;
  "data-adapttable-part"?: string;
  children: ReactNode;
  /** Validation and busy state from the headless layer. */
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-busy"?: true;
  "data-conflict"?: "";
  disabled?: boolean;
}>) {
  return (
    <ChakraNativeSelect.Root
      size={size}
      flex={flex}
      w={w}
      minW={minW}
      maxW={maxW}
    >
      <ChakraNativeSelect.Field
        className={className}
        ref={fieldRef}
        data-adapttable-part={dataPart}
        minH={minH}
        aria-label={ariaLabel}
        // A multiple field is a list box: Chakra's placeholder renders an
        // empty first option, which reads as a selectable value there.
        placeholder={multiple ? undefined : placeholder}
        multiple={multiple}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        {...rest}
      >
        {children}
      </ChakraNativeSelect.Field>
      {multiple ? null : <ChakraNativeSelect.Indicator />}
    </ChakraNativeSelect.Root>
  );
}

/**
 * Labelled form field recomposing Chakra v3's `Field.*` compound into the v2
 * `FormControl` + `FormLabel` pairing the auto-filter form used: a small,
 * tight label above the control.
 */
export function FormField({
  label,
  children,
}: Readonly<{ label: ReactNode; children: ReactNode }>) {
  return (
    <ChakraField.Root>
      <ChakraField.Label fontSize="sm" mb={4}>
        {label}
      </ChakraField.Label>
      {children}
    </ChakraField.Root>
  );
}
