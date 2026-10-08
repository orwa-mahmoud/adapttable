import type {
  ContextMenuChromeProps,
  ContextMenuPresentation,
} from "@adapttable/vue/adapter";
import { h } from "vue";

export const presentation: ContextMenuPresentation = (props) =>
  h(
    "div",
    { role: "menu", "aria-label": props.label },
    props.items.map(({ item, onSelect }) =>
      h(
        "button",
        {
          disabled: item.disabled,
          onClick: () => {
            if (props.isCurrent()) onSelect();
          },
        },
        item.label
      )
    )
  );

export const complete: ContextMenuChromeProps = {
  items: [],
  at: null,
  onClose: () => undefined,
  presentation,
};
export const individual: ContextMenuChromeProps = {
  items: [],
  at: null,
  onClose: () => undefined,
  slots: {
    Surface: ({ children }) => h("div", [children]),
    Item: ({ item, onSelect }) =>
      h("button", { onClick: onSelect }, item.label),
    Separator: () => h("hr"),
  },
};
