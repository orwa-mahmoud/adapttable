import {
  type DataTableClassNames,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { useManagedPanel } from "../columns/ManagedPanel";
import { shadcnInput } from "../controls";
import { shadcnAction } from "../tableControls";

export function useShadcnSavedMenuSlots(): SavedViewsMenuSlots {
  return {
    Trigger: ({ attrs, label }) => shadcnAction(attrs, label),
    Button: ({ attrs, label }) => shadcnAction(attrs, label),
    Input: shadcnInput,
    Panel: useManagedPanel(),
  };
}

export function shadcnSavedPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (control) =>
      h(
        "section",
        {
          "data-adapttable-part": control["data-adapttable-part"],
          class: [
            "space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground",
            control.className,
          ],
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
          class: [
            "gap-2 rounded-md border border-border p-2",
            names().viewsRow,
          ],
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
                : shadcnAction(
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
              shadcnAction(
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
      shadcnInput({
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
