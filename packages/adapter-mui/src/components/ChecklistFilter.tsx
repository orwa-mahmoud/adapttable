import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/core/adapter";
import { Button, Checkbox, FormControlLabel, TextField } from "@mui/material";

export type { ChecklistFilterProps };

function ChecklistSearch({
  label,
  value,
  className,
  onChange,
}: ChecklistSearchProps) {
  return (
    <TextField
      size="small"
      type="search"
      placeholder={label}
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        htmlInput: {
          "aria-label": label,
          "data-adapttable-part": "filter-checklist-search",
        },
      }}
    />
  );
}

function ChecklistButton({ label, onClick }: ChecklistButtonProps) {
  return (
    <Button type="button" size="small" onClick={onClick}>
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
    <FormControlLabel
      data-adapttable-part="filter-checkbox"
      className={className}
      sx={{ flex: "0 0 auto", mr: 0, width: "auto" }}
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
      control={
        <Checkbox
          size="small"
          checked={checked}
          onChange={(_, on) => onChange(on)}
        />
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
 * MUI checklist — wrapping kit checkboxes, not one value per row.
 *
 * @public
 */
export function ChecklistFilter<TRow>(
  props: Readonly<ChecklistFilterProps<TRow>>
) {
  return <ChecklistChrome {...props} slots={slots} />;
}
