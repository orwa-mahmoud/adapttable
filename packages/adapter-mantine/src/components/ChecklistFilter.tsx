import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/core/adapter";
import { Button, Checkbox, TextInput } from "@mantine/core";

export type { ChecklistFilterProps };

function ChecklistSearch({
  label,
  value,
  className,
  onChange,
}: ChecklistSearchProps) {
  return (
    <TextInput
      size="sm"
      type="search"
      aria-label={label}
      placeholder={label}
      className={className}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      data-adapttable-part="filter-checklist-search"
    />
  );
}

function ChecklistButton({ label, onClick }: ChecklistButtonProps) {
  return (
    <Button type="button" size="xs" variant="default" onClick={onClick}>
      {label}
    </Button>
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
    <Checkbox
      size="sm"
      className={className}
      style={{ width: "auto" }}
      checked={checked}
      onChange={(event) => onChange(event.currentTarget.checked)}
      // Mantine forwards loose props to the <input>, but `className` lands on
      // the root — so the part goes through `wrapperProps` to keep both on the
      // whole control, the element MUI and unstyled tag.
      wrapperProps={{ "data-adapttable-part": "filter-checkbox" }}
      label={
        <span>
          {label}{" "}
          <span
            data-adapttable-part="filter-checklist-count"
            className={countClassName}
          >
            {count}
          </span>
        </span>
      }
    />
  );
}

const slots: ChecklistSlots = {
  Search: ChecklistSearch,
  Button: ChecklistButton,
  Checkbox: ChecklistBox,
};

/**
 * Mantine checklist — wrapping kit checkboxes, not one value per row.
 *
 * @public
 */
export function ChecklistFilter<TRow>(
  props: Readonly<ChecklistFilterProps<TRow>>
) {
  return <ChecklistChrome {...props} slots={slots} />;
}
