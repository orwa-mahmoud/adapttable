/**
 * The checklist filter drawn with a kit's primitives: its search field, its
 * "select all" and "clear" buttons and one labelled checkbox per value, each
 * with the value's count.
 */
import type { CSSProperties, ReactElement } from "react";

import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
} from "../filters/ChecklistChrome";
import type { KitButtonProps, KitPrimitivesOf } from "./primitives";

/**
 * How a kit's checklist looks: its buttons' variant and each labelled
 * checkbox's layout in the wrapping list.
 *
 * @public
 */
export interface KitChecklistLook {
  /** The variant and tone of the "select all" and "clear" buttons. */
  readonly button?: Pick<KitButtonProps, "variant" | "tone">;
  /** Each labelled checkbox's root in the wrapping list. */
  readonly checkbox?: CSSProperties;
}

/**
 * A kit's checklist filter.
 *
 * @public
 */
export type KitChecklistFilter = <TRow>(
  props: Readonly<ChecklistFilterProps<TRow>>
) => ReactElement;

/**
 * Builds the checklist filter from a kit's text field, button and checkbox.
 *
 * @public
 */
export function createChecklistFilter(
  kit: KitPrimitivesOf<"TextInput" | "Button" | "Checkbox">,
  look: KitChecklistLook = {}
): KitChecklistFilter {
  const { TextInput, Button, Checkbox } = kit;
  const slots: ChecklistSlots = {
    Search: ({ label, value, className, onChange }) => (
      <TextInput
        type="search"
        placeholder={label}
        aria-label={label}
        className={className}
        value={value}
        onValueChange={onChange}
        data-adapttable-part="filter-checklist-search"
      />
    ),
    Button: ({ label, onClick }) => (
      <Button type="button" {...look.button} onClick={onClick}>
        {label}
      </Button>
    ),
    Checkbox: ({
      label,
      count,
      checked,
      className,
      countClassName,
      onChange,
    }) => (
      <Checkbox
        rootPart="filter-checkbox"
        className={className}
        style={look.checkbox}
        checked={checked}
        onCheckedChange={onChange}
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
    ),
  };
  return function ChecklistFilter<TRow>(
    props: Readonly<ChecklistFilterProps<TRow>>
  ) {
    return <ChecklistChrome {...props} slots={slots} />;
  };
}
