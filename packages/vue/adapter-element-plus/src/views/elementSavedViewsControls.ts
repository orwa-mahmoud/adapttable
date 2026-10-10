import {
  managedOverlayPanel,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { ElTag } from "element-plus";
import { h } from "vue";

import { ElementColumnMenuPanel } from "../columns/ElementColumnMenuPanel";
import { elementButton } from "../controls/button";
import ElementInput from "../controls/ElementInput.vue";
import { ElementCard } from "../presentation/ElementCard";
import type { DataTableClassNames } from "../types";
export const elementSavedViewsMenuSlots: SavedViewsMenuSlots = {
  Trigger: ({ attrs, label }) => elementButton(attrs, label),
  Button: ({ attrs, label }) => elementButton(attrs, label),
  Input: ({ attrs, value, onChange }) =>
    h(ElementInput, { ...attrs, value, onChange }),
  Panel: managedOverlayPanel((control) =>
    h(ElementColumnMenuPanel, {
      control,
      initialFocus: 'input[data-adapttable-part="views-input"]',
    })
  ),
};
export function elementSavedViewsPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (props) =>
      h(
        ElementCard,
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
                : elementButton(
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
                    ElTag,
                    { "data-adapttable-part": "saved-view-default" },
                    { default: () => props.defaultLabel }
                  )
                : null,
              props.readOnly
                ? h(
                    ElTag,
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
              elementButton(
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
      h(ElementInput, {
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
