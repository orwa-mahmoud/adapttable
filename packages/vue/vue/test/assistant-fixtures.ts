import { h } from "vue";

import type { TableAssistantSlots } from "../src/assistant/contracts";
/** Deliberately simple test controls prove that Chrome calls every required slot. */
export const testSlots: TableAssistantSlots = {
  Button: (props) =>
    h(
      "button",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        "aria-expanded": props.expanded,
        disabled: props.disabled,
        title: props.tooltip,
        onClick: props.onClick,
      },
      [props.children ?? props.label]
    ),
  Composer: (props) =>
    h("textarea", {
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      value: props.value,
      disabled: props.disabled,
      onInput: (event: Event) =>
        props.onChange((event.target as HTMLTextAreaElement).value),
      onKeydown: props.onKeyDown,
    }),
  Badge: (props) =>
    h(
      "span",
      { "data-adapttable-part": props.part, "data-tone": props.tone },
      props.label
    ),
  Panel: (props) =>
    h("section", { "data-adapttable-part": props.part }, [props.children]),
  Window: (props) =>
    h("section", { "data-adapttable-part": props.part, style: props.style }, [
      props.children,
    ]),
  Sheet: (props) =>
    h("section", { "data-adapttable-part": props.part, dir: props.dir }, [
      props.children,
      h(
        "button",
        { "data-close-sheet": true, onClick: props.onClose },
        "close sheet"
      ),
    ]),
  Menu: (props) =>
    h(
      "select",
      {
        "data-adapttable-part": props.part,
        disabled: props.disabled,
        onChange: (event: Event) =>
          props.onSelect((event.target as HTMLSelectElement).value),
      },
      props.items.map((item) => h("option", { value: item.id }, item.title))
    ),
  LanguageChip: (props) =>
    h(
      "select",
      {
        "data-adapttable-part": props.part,
        disabled: props.disabled,
        value: props.value,
        onChange: (event: Event) =>
          props.onChange((event.target as HTMLSelectElement).value),
      },
      props.options.map((item) =>
        h("option", { value: item.value }, item.label)
      )
    ),
};
