import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  type ColumnSelectSlots,
} from "@adapttable/core/adapter";
import { Checkbox } from "@mantine/core";

function ColumnSelectBox({
  label,
  checked,
  onToggle,
}: Readonly<ColumnSelectCheckboxProps>) {
  return (
    <Checkbox
      size="xs"
      aria-label={label}
      checked={checked}
      onChange={onToggle}
    />
  );
}

const slots: ColumnSelectSlots = { Checkbox: ColumnSelectBox };

/**
 * Mantine's header checkbox that selects a whole column.
 *
 * The layout, the part name, the accessible name and the click/key containment
 * are core's; the control is this kit's own.
 */
export function ColumnSelectCheckbox(
  props: Readonly<Omit<ColumnSelectCheckboxChromeProps, "slots">>
) {
  return <ColumnSelectCheckboxChrome {...props} slots={slots} />;
}
