import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  type ColumnSelectSlots,
} from "@adapttable/core/adapter";
import { Checkbox } from "@mui/material";

function ColumnSelectBox({
  label,
  checked,
  onToggle,
}: Readonly<ColumnSelectCheckboxProps>) {
  return (
    <Checkbox
      size="small"
      sx={{ p: 0.25 }}
      checked={checked}
      onChange={onToggle}
      slotProps={{ input: { "aria-label": label } }}
    />
  );
}

const slots: ColumnSelectSlots = { Checkbox: ColumnSelectBox };

/**
 * MUI's header checkbox that selects a whole column.
 *
 * The layout, the part name, the accessible name and the click/key containment
 * are core's; the control is this kit's own.
 */
export function ColumnSelectCheckbox(
  props: Readonly<Omit<ColumnSelectCheckboxChromeProps, "slots">>
) {
  return <ColumnSelectCheckboxChrome {...props} slots={slots} />;
}
