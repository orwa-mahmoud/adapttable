import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Select } from "@base-ui/react/select";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { isValidElement, type ReactElement, type ReactNode } from "react";

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
  "aria-label": ariaLabel,
  children,
}: Readonly<{
  checked: boolean;
  indeterminate?: boolean;
  onToggle?: () => void;
  size?: "1" | "2" | "3";
  color?: BaseUiAccentColor;
  id?: string;
  value?: string;
  "aria-label"?: string;
  children?: ReactNode;
}>) {
  const box = (
    <BaseCheckbox.Root
      id={id}
      value={value}
      aria-label={children == null ? ariaLabel : undefined}
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={onToggle ? () => onToggle() : undefined}
      className="adapttable-checkbox"
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
  if (children == null) return box;
  // Native <label> (not Text-as-label): Base UI wires aria-labelledby to the
  // enclosing label id; a plain label keeps the visible text as the name.
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
 * Controlled select over Base UI `Select.*`, with empty-value sentinel
 * round-trip for placeholder / clear choices.
 */
export function NativeSelect({
  size = "2",
  value,
  placeholder,
  onValueChange,
  options,
  width,
  "aria-label": ariaLabel,
}: Readonly<{
  size?: "1" | "2" | "3";
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  width?: string;
  "aria-label"?: string;
}>) {
  const selected = value === "" ? EMPTY_VALUE : value;
  const items = Object.fromEntries(
    options.map((option) => [
      option.value === "" ? EMPTY_VALUE : option.value,
      option.label,
    ])
  );
  return (
    <Select.Root
      value={selected}
      items={items}
      onValueChange={(next) =>
        onValueChange(next === EMPTY_VALUE || next == null ? "" : String(next))
      }
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className="adapttable-btn"
        data-size={size}
        data-variant="outline"
        data-slot="select-trigger"
        style={width ? { width } : undefined}
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
    <Flex direction="column" gap="1">
      <Text as="span" size="2">
        {label}
      </Text>
      {children}
    </Flex>
  );
}
