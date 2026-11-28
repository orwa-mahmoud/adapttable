import {
  managedOverlayPanel,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { Tag } from "ant-design-vue";
import { h } from "vue";

import { AntdColumnMenuPanel } from "../columns/AntdColumnMenuPanel";
import AntdInput from "../controls/AntdInput.vue";
import { antdButton } from "../controls/button";
import { AntdCard } from "../presentation/AntdCard";
import type { DataTableClassNames } from "../types";
export const antdSavedViewsMenuSlots: SavedViewsMenuSlots = {
  Trigger: ({ attrs, label }) => antdButton(attrs, label),
  Button: ({ attrs, label }) => antdButton(attrs, label),
  Input: ({ attrs, value, onChange }) =>
    h(AntdInput, { ...attrs, value, onChange }),
  Panel: managedOverlayPanel((control) =>
    h(AntdColumnMenuPanel, {
      control,
      initialFocus: 'input[data-adapttable-part="views-input"]',
    })
  ),
};
export function antdSavedViewsPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (props) =>
      h(
        AntdCard,
        {
          attrs: {
            "data-adapttable-part": props["data-adapttable-part"],
            class: props.className,
          },
        },
        {
          default: () => [
            h(
              "h2",
              { "data-adapttable-part": "saved-views-title" },
              props.title
            ),
            props.children,
            props.footer
              ? h("span", { "data-adapttable-part": "saved-views-footer" }, [
                  props.footer,
                ])
              : null,
          ],
        }
      ),
    Row: (props) =>
      h(
        "div",
        {
          key: props.viewName,
          class: names().viewsRow,
          "data-adapttable-part": props["data-adapttable-part"],
          style: props.layout.row,
        },
        [
          h(
            "div",
            {
              "data-adapttable-part": "saved-view-caption",
              style: props.layout.caption,
            },
            [
              props.isEditing
                ? props.name
                : antdButton(
                    {
                      type: "button",
                      title: props.applyLabel,
                      class: names().viewsItem,
                      onClick: props.onApply,
                    },
                    [props.name]
                  ),
              props.isDefault
                ? h(
                    Tag,
                    { "data-adapttable-part": "saved-view-default" },
                    { default: () => props.defaultLabel }
                  )
                : null,
              props.readOnly
                ? h(
                    Tag,
                    { "data-adapttable-part": "saved-view-readonly" },
                    { default: () => props.readOnlyLabel }
                  )
                : null,
            ]
          ),
          h(
            "div",
            {
              "data-adapttable-part": "saved-view-controls",
              style: props.layout.controls,
            },
            props.controls.map((control) =>
              antdButton(
                {
                  key: control.key,
                  type: "button",
                  class: names().viewsDelete,
                  title: control.label,
                  "aria-label": control.label,
                  "aria-pressed": control.pressed,
                  disabled: !control.onPress,
                  onClick: control.onPress,
                  style: props.layout.control,
                },
                [control.icon]
              )
            )
          ),
        ]
      ),
    Input: (props) =>
      h(AntdInput, {
        inputRef: (element) => {
          if (element instanceof HTMLInputElement || element === null)
            props.ref(element);
        },
        class: names().viewsInput,
        "aria-label": props.label,
        value: props.value,
        onChange: props.onChange,
        onKeydown: (event: KeyboardEvent) => {
          if (event.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            props.onCommit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            props.onCancel();
          }
        },
      }),
    Empty: ({ message }) => h("p", message),
  };
}
