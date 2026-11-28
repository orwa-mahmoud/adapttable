import type { Attrs } from "@adapttable/vue";
import { mergeProps, type VNodeChild } from "vue";

import { HeadlessPrimitive } from "./primitive";
import { headlessTarget } from "./target";

/** Headless UI for Vue has no Button; the primitive keeps real button semantics. */
export function headlessButton(attrs: Attrs, children: VNodeChild) {
  return headlessTarget(
    HeadlessPrimitive,
    mergeProps(
      { as: "button", type: "button", class: "at-headless-button" },
      attrs
    ),
    { default: () => children }
  );
}

export interface HeadlessInputControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly type?: string;
  readonly onChange: (value: string) => void;
}

/** Headless UI for Vue has no text field; the primitive renders the native input. */
export function headlessInput(control: HeadlessInputControl) {
  return headlessTarget(
    HeadlessPrimitive,
    mergeProps(control.attrs, {
      as: "input",
      type: control.type ?? "text",
      class: "at-headless-input",
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
