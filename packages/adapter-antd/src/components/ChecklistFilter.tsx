import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/core/adapter";
import { Button, Checkbox, Input } from "antd";

export type { ChecklistFilterProps };

function ChecklistSearch({
  label,
  value,
  className,
  onChange,
}: ChecklistSearchProps) {
  return (
    <Input
      size="small"
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
    <Button type="default" size="small" onClick={onClick}>
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
    // antd routes loose props to the inner <input> and `className` to its own
    // wrapper, which would leave the part and the class on different elements.
    // One span outside both keeps them together, on the whole control — the
    // element MUI and unstyled tag.
    <span
      data-adapttable-part="filter-checkbox"
      className={className}
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      >
        {label}{" "}
        <span
          data-adapttable-part="filter-checklist-count"
          className={countClassName}
        >
          {count}
        </span>
      </Checkbox>
    </span>
  );
}

const slots: ChecklistSlots = {
  Search: ChecklistSearch,
  Button: ChecklistButton,
  Checkbox: ChecklistBox,
};

/**
 * Ant Design checklist — wrapping kit checkboxes, not one value per row.
 *
 * @public
 */
export function ChecklistFilter<TRow>(
  props: Readonly<ChecklistFilterProps<TRow>>
) {
  return <ChecklistChrome {...props} slots={slots} />;
}
