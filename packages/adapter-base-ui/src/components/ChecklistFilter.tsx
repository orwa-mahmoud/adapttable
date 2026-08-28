import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/core/adapter";

import { Button, TextField } from "../ui";
import { Checkbox } from "./primitives";

export type { ChecklistFilterProps };

function ChecklistSearch({
  label,
  value,
  className,
  onChange,
}: ChecklistSearchProps) {
  return (
    <TextField.Root
      size="2"
      type="search"
      aria-label={label}
      placeholder={label}
      data-adapttable-part="filter-checklist-search"
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ChecklistButton({ label, onClick }: ChecklistButtonProps) {
  return (
    <Button type="button" size="1" variant="soft" onClick={onClick}>
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
      data-adapttable-part="filter-checkbox"
      className={className}
      checked={checked}
      onToggle={() => onChange(!checked)}
    >
      <span>
        {label}{" "}
        <span
          data-adapttable-part="filter-checklist-count"
          className={countClassName}
        >
          {count}
        </span>
      </span>
    </Checkbox>
  );
}

const slots: ChecklistSlots = {
  Search: ChecklistSearch,
  Button: ChecklistButton,
  Checkbox: ChecklistBox,
};

/**
 * Base UI checklist — wrapping kit checkboxes, not one value per row.
 *
 * @public
 */
export function ChecklistFilter<TRow>(
  props: Readonly<ChecklistFilterProps<TRow>>
) {
  return <ChecklistChrome {...props} slots={slots} />;
}
