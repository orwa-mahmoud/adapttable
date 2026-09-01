import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  type ColumnSelectSlots,
} from "@adapttable/core/adapter";

function ColumnSelectBox({
  label,
  checked,
  onToggle,
}: Readonly<ColumnSelectCheckboxProps>) {
  // No part of its own: `column-select` on core's wrapper names the whole
  // control, which is the element every other kit tags too.
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onToggle}
    />
  );
}

const slots: ColumnSelectSlots = { Checkbox: ColumnSelectBox };

/**
 * The native control's header checkbox that selects a whole column.
 *
 * The layout, the part name, the accessible name and the click/key containment
 * are core's; the control is this kit's own.
 */
export function ColumnSelectCheckbox(
  props: Readonly<Omit<ColumnSelectCheckboxChromeProps, "slots">>
) {
  return <ColumnSelectCheckboxChrome {...props} slots={slots} />;
}
