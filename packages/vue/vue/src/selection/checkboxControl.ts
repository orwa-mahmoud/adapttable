import type { Attrs } from "../attrs";

/** Native checkbox wiring owned by the selection model. */
export interface SelectionCheckboxAttrs extends Attrs {
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly onChange: () => void;
}

/**
 * One selection interaction, exposed independently of a kit's event API.
 * `onToggle` requests a toggle; it is not a checked-value setter. A kit may
 * connect one user-interaction event, such as its model update, to this action.
 * Repeated interactions request repeated toggles, even if their payloads match.
 */
export interface SelectionCheckboxControl {
  /** Full native wiring, retained for native controls and existing adapters. */
  readonly attrs: Attrs;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly onToggle: () => void;
}

/** Project the existing state/action without introducing another state owner. */
export function selectionCheckboxControl(
  attrs: SelectionCheckboxAttrs
): SelectionCheckboxControl {
  return {
    attrs,
    checked: attrs.checked,
    indeterminate: attrs.indeterminate ?? false,
    onToggle: attrs.onChange,
  };
}

/**
 * Attributes for a kit control that owns its value/change API. Forward these
 * to that kit's actual checkbox target and connect `onToggle` exactly once.
 * The legacy native listener must not also handle a kit's change event.
 * ARIA, data, refs, keyboard, disabled and form attributes remain untouched.
 */
export function selectionCheckboxInputAttrs(attrs: Attrs): Attrs {
  return Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) =>
        key !== "checked" && key !== "indeterminate" && key !== "onChange"
    )
  );
}
