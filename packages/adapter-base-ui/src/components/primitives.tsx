import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Select } from "@base-ui/react/select";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import type { BaseUiAccentColor } from "../types";
import { Flex, Text } from "../ui";

/**
 * Tooltip wrapper presenting the `label` + single-trigger-child contract the
 * adapter relies on. `disabled` (or an empty label) suppresses the tip and
 * renders the trigger untouched.
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
  if (!isValidElement(children)) return <>{children}</>;
  return (
    <BaseTooltip.Provider>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children as ReactElement} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner sideOffset={6}>
            <BaseTooltip.Popup className="adapttable-tooltip">
              {label}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}

/**
 * Checkbox wrapper: controlled `checked` / `indeterminate`, `onToggle`, optional
 * label children, and `aria-label`.
 */
export function Checkbox({
  checked,
  indeterminate,
  onToggle,
  size: _size,
  color: _color,
  id,
  value,
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
  size?: "1" | "2" | "3";
  color?: BaseUiAccentColor;
  id?: string;
  value?: string;
  className?: string;
  /** Hands the control out, so a cell editor can take focus on mount. */
  inputRef?: (node: { focus: () => void } | null) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  "aria-label"?: string;
  "data-adapttable-part"?: string;
  children?: ReactNode;
  /** Validation and busy state from the headless layer. */
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-busy"?: true;
  "data-conflict"?: "";
}>) {
  // The part and the class name the WHOLE control, so with a visible label
  // they belong to the wrapper that holds box and text together — the same
  // element MUI tags — and only to the box when there is nothing else.
  const box = (
    <BaseCheckbox.Root
      id={id}
      value={value}
      ref={inputRef}
      aria-label={children == null ? ariaLabel : undefined}
      onKeyDown={onKeyDown}
      data-adapttable-part={children == null ? dataPart : undefined}
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={onToggle ? () => onToggle() : undefined}
      className={
        children == null
          ? (className ?? "adapttable-checkbox")
          : "adapttable-checkbox"
      }
      {...rest}
    >
      <BaseCheckbox.Indicator className="adapttable-checkbox__indicator">
        {indeterminate ? (
          <span aria-hidden="true">–</span>
        ) : (
          <span aria-hidden="true">✓</span>
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
  if (children == null) return box;
  // Native <label> (not Text-as-label): Base UI wires aria-labelledby to the
  // enclosing label id; a plain label keeps the visible text as the name.
  return (
    <label
      className={className}
      data-adapttable-part={dataPart}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      {box}
      <Text as="span" size="2">
        {children}
      </Text>
    </label>
  );
}

/** One `<option>`-equivalent entry for {@link NativeSelect}. */
export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

/**
 * Sentinel for empty values — Base UI Select items should use a non-empty
 * value token; callers keep using `""` for "cleared".
 */
const EMPTY_VALUE = "__adapttable_empty__";

/**
 * What the kit's Select is given for a caller's value.
 *
 * A cleared select shows the placeholder, and Base UI shows one only for a
 * value it has no item for — `null`. The sentinel is for a list that offers an
 * empty CHOICE ("Any"): naming it when no such item exists printed the
 * sentinel itself where the placeholder belonged.
 */
function selectedValue(value: string, offersEmpty: boolean): string | null {
  if (value !== "") return value;
  return offersEmpty ? EMPTY_VALUE : null;
}

/**
 * Controlled select over Base UI `Select.*`, with empty-value sentinel
 * round-trip for placeholder / clear choices.
 */
export function NativeSelect({
  size = "2",
  value,
  placeholder,
  onValueChange,
  onKeyDown,
  options,
  width,
  className,
  "aria-label": ariaLabel,
  "data-adapttable-part": part,
  ...rest
}: Readonly<{
  size?: "1" | "2" | "3";
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  options: readonly SelectOption[];
  width?: string;
  className?: string;
  "aria-label"?: string;
  "data-adapttable-part"?: string;
  /** Validation and busy state from the headless layer. */
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-busy"?: true;
  "data-conflict"?: "";
}>) {
  const items = Object.fromEntries(
    options.map((option) => [
      option.value === "" ? EMPTY_VALUE : option.value,
      option.label,
    ])
  );
  const selected = selectedValue(value, EMPTY_VALUE in items);
  return (
    <Select.Root
      value={selected}
      items={items}
      onValueChange={(next, details) => {
        // This select is controlled by its caller, so the only value change
        // worth forwarding is one the user made. The kit also reconciles the
        // value itself when the item registry changes shape, reported as
        // `reason: "none"` — with an options list that depends on the current
        // value (the rows-per-page sizes do), that reconciliation lands after
        // a real selection and reverts it to the value the select mounted with.
        if (details.reason === "none") return;
        onValueChange(next === EMPTY_VALUE || next == null ? "" : String(next));
      }}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        data-adapttable-part={part}
        className={className ?? "adapttable-btn"}
        data-size={size}
        data-variant="outline"
        data-slot="select-trigger"
        onKeyDown={onKeyDown}
        style={width ? { width } : undefined}
        {...rest}
      >
        <Select.Value data-slot="select-value" placeholder={placeholder} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="adapttable-select-positioner"
          sideOffset={4}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="adapttable-select-popup">
            <Select.List>
              {options.map((option) => {
                const itemValue =
                  option.value === "" ? EMPTY_VALUE : option.value;
                return (
                  <Select.Item
                    key={itemValue}
                    value={itemValue}
                    disabled={option.disabled}
                    className="adapttable-select-item"
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                );
              })}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/** Labelled form field: a small label above its control. */
export function FormField({
  label,
  children,
}: Readonly<{ label: ReactNode; children: ReactNode }>) {
  return (
    <Flex direction="column" gap="4">
      <Text as="span" size="2">
        {label}
      </Text>
      {children}
    </Flex>
  );
}
