import type { Attrs } from "@adapttable/vue";
import { Primitive } from "reka-ui";
import { h, mergeProps, type VNodeChild } from "vue";

import { targetAttrs } from "./target";

/** Reka has no Button component; Primitive preserves real button semantics. */
export function rekaButton(attrs: Attrs, children: VNodeChild) {
  return h(
    Primitive,
    mergeProps(
      { as: "button", type: "button", class: "at-reka-button" },
      targetAttrs(attrs)
    ),
    { default: () => children }
  );
}

export interface RekaInputControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly type?: string;
  readonly onChange: (value: string) => void;
}

/** A native field is Reka's documented Primitive composition for text input. */
export function rekaInput(control: RekaInputControl) {
  return h(
    Primitive,
    mergeProps(targetAttrs(control.attrs), {
      as: "input",
      type: control.type ?? "text",
      class: "at-reka-input",
      value: control.value,
      onInput: (event: Event) => {
        const input = event.currentTarget;
        if (!(input instanceof HTMLInputElement)) return;
        control.onChange(input.value);
        // Reset the native draft when the controlled host rejects the request.
        input.value = control.value;
      },
    })
  );
}
