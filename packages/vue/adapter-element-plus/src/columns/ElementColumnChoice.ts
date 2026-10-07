import type { ColumnMenuSlots } from "@adapttable/vue/adapter";
import { defineComponent, h, inject } from "vue";

import ElementSelect from "../controls/ElementSelect.vue";
import { columnMenuContainer } from "./panelContext";

type ChoiceControl = Parameters<ColumnMenuSlots["Choice"]>[0];
function isKeyboardHandler(
  value: unknown
): value is (event: KeyboardEvent) => void {
  return typeof value === "function";
}
export const ElementColumnChoice = defineComponent(
  (props: { readonly control: ChoiceControl }) => {
    const container = inject(columnMenuContainer, undefined);
    const escape = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !event.isComposing &&
        target instanceof Element &&
        target.getAttribute("role") === "combobox" &&
        target.getAttribute("aria-expanded") === "false"
      ) {
        const handler = props.control.attrs.onKeydown;
        if (isKeyboardHandler(handler)) handler(event);
      }
    };
    return () =>
      h(ElementSelect, {
        ...props.control.attrs,
        value: props.control.value,
        options: props.control.options,
        teleported: container?.value != null,
        appendTo: container?.value ?? undefined,
        onChange: props.control.onChange,
        onKeydownCapture: escape,
      });
  },
  { name: "ElementColumnChoice", props: ["control"] }
);
