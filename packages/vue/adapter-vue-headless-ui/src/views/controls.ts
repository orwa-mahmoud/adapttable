import type {
  SavedViewsMenuSlots,
  SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton, headlessInput } from "../controls/basic";
import { headlessManagedPanel } from "../controls/managedPanel";
import type { DataTableClassNames } from "../types";

export const headlessSavedMenuSlots: SavedViewsMenuSlots = {
  Trigger: ({ attrs, label }) => headlessButton(attrs, label),
  Button: ({ attrs, label }) => headlessButton(attrs, label),
  Input: headlessInput,
  Panel: headlessManagedPanel,
};

export function headlessSavedPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (control) =>
      h(
        "section",
        {
          "data-adapttable-part": control["data-adapttable-part"],
          class: control.className,
        },
        [
          h(
            "h2",
            { "data-adapttable-part": "saved-views-title" },
            control.title
          ),
          control.children,
          control.footer
            ? h("span", { "data-adapttable-part": "saved-views-footer" }, [
                control.footer,
              ])
            : null,
        ]
      ),
    Row: (control) =>
      h(
        "div",
        {
          key: control.viewName,
          "data-adapttable-part": control["data-adapttable-part"],
          class: names().viewsRow,
          style: control.layout.row,
        },
        [
          h(
            "div",
            {
              "data-adapttable-part": "saved-view-caption",
              style: control.layout.caption,
            },
            [
              control.isEditing
                ? control.name
                : headlessButton(
                    {
                      title: control.applyLabel,
                      class: names().viewsItem,
                      onClick: control.onApply,
                    },
                    control.name
                  ),
              control.isDefault
                ? h(
                    "span",
                    { "data-adapttable-part": "saved-view-default" },
                    control.defaultLabel
                  )
                : null,
              control.readOnly
                ? h(
                    "span",
                    { "data-adapttable-part": "saved-view-readonly" },
                    control.readOnlyLabel
                  )
                : null,
            ]
          ),
          h(
            "div",
            {
              "data-adapttable-part": "saved-view-controls",
              style: control.layout.controls,
            },
            control.controls.map((action) =>
              headlessButton(
                {
                  key: action.key,
                  class: names().viewsDelete,
                  title: action.label,
                  "aria-label": action.label,
                  "aria-pressed": action.pressed,
                  disabled: !action.onPress,
                  onClick: action.onPress,
                  style: control.layout.control,
                },
                action.icon
              )
            )
          ),
        ]
      ),
    Input: (control) =>
      headlessInput({
        value: control.value,
        onChange: control.onChange,
        attrs: {
          ref: control.ref,
          class: names().viewsInput,
          "aria-label": control.label,
          onKeydown: (event: KeyboardEvent) => {
            if (event.isComposing) return;
            if (event.key === "Enter") {
              event.preventDefault();
              control.onCommit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              control.onCancel();
            }
          },
        },
      }),
    Empty: ({ message }) => h("p", message),
  };
}
