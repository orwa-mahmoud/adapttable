import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/core/adapter";
import type { ChangeEvent } from "react";

export type { ChecklistFilterProps };

function ChecklistSearch({
  label,
  value,
  className,
  onChange,
}: ChecklistSearchProps) {
  return (
    <input
      type="search"
      aria-label={label}
      placeholder={label}
      data-adapttable-part="filter-checklist-search"
      className={className}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
  );
}

function ChecklistButton({ label, onClick }: ChecklistButtonProps) {
  return (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function ChecklistBox({
  label,
  count,
  checked,
  className,
  countClassName,
  onChange,
}: ChecklistCheckboxProps) {
  return (
    <label
      data-adapttable-part="filter-checkbox"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        width: "auto",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.checked)
        }
      />{" "}
      {label}{" "}
      <span
        data-adapttable-part="filter-checklist-count"
        className={countClassName}
      >
        {count}
      </span>
    </label>
  );
}

const slots: ChecklistSlots = {
  Search: ChecklistSearch,
  Button: ChecklistButton,
  Checkbox: ChecklistBox,
};

/**
 * Native checklist — wrapping options, not one value per row.
 *
 * @public
 */
export function ChecklistFilter<TRow>(
  props: Readonly<ChecklistFilterProps<TRow>>
) {
  return <ChecklistChrome {...props} slots={slots} />;
}
