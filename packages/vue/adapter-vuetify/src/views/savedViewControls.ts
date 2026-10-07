import {
  managedOverlayPanel,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
  type ViewControlButtonProps,
} from "@adapttable/vue/adapter";
import { h } from "vue";
import { VCard, VCardText, VCardTitle } from "vuetify/components/VCard";
import { VChip } from "vuetify/components/VChip";
import { VSheet } from "vuetify/components/VSheet";

import VuetifyManagedPopover from "../columns/VuetifyManagedPopover.vue";
import VuetifyButton from "../controls/VuetifyButton.vue";
import VuetifyInput from "../controls/VuetifyInput.vue";
import type { DataTableClassNames } from "../types";

function button({ attrs, label }: ViewControlButtonProps) {
  return h(VuetifyButton, { attrs, content: label });
}

export const vuetifySavedViewsMenuSlots: SavedViewsMenuSlots = {
  Trigger: button,
  Button: button,
  Input: ({ attrs, value, onChange }) =>
    h(VuetifyInput, { attrs, value, onChange }),
  Panel: managedOverlayPanel((control) =>
    h(VuetifyManagedPopover, { control })
  ),
};

function row(
  props: Parameters<SavedViewsPanelSlots["Row"]>[0],
  names: DataTableClassNames
) {
  return h(
    VSheet,
    {
      key: props.viewName,
      class: names.viewsRow,
      "data-adapttable-part": props["data-adapttable-part"],
      style: props.layout.row,
    },
    () => [
      h(
        VSheet,
        {
          "data-adapttable-part": "saved-view-caption",
          style: props.layout.caption,
        },
        () => [
          props.isEditing
            ? props.name
            : h(VuetifyButton, {
                attrs: {
                  title: props.applyLabel,
                  class: names.viewsItem,
                  onClick: props.onApply,
                },
                content: props.name,
              }),
          props.isDefault
            ? h(
                VChip,
                {
                  size: "small",
                  variant: "tonal",
                  "data-adapttable-part": "saved-view-default",
                },
                () => props.defaultLabel
              )
            : null,
          props.readOnly
            ? h(
                VChip,
                {
                  size: "small",
                  variant: "tonal",
                  "data-adapttable-part": "saved-view-readonly",
                },
                () => props.readOnlyLabel
              )
            : null,
        ]
      ),
      h(
        VSheet,
        {
          "data-adapttable-part": "saved-view-controls",
          style: props.layout.controls,
        },
        () =>
          props.controls.map((control) =>
            h(VuetifyButton, {
              key: control.key,
              attrs: {
                class: names.viewsDelete,
                title: control.label,
                "aria-label": control.label,
                "aria-pressed": control.pressed,
                disabled: !control.onPress,
                onClick: control.onPress,
                style: props.layout.control,
                color: control.danger ? "error" : undefined,
                icon: true,
              },
              content: control.icon,
            })
          )
      ),
    ]
  );
}

/** Paint the binding's ordered controls without recreating its view model. */
export function vuetifySavedViewsPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (props) =>
      h(
        VCard,
        {
          tag: "section",
          "data-adapttable-part": props["data-adapttable-part"],
          class: props.className,
          variant: "outlined",
        },
        () => [
          h(
            VCardTitle,
            { tag: "h2", "data-adapttable-part": "saved-views-title" },
            () => props.title
          ),
          h(VCardText, {}, () => props.children),
          props.footer
            ? h(
                VCardText,
                { "data-adapttable-part": "saved-views-footer" },
                () => props.footer
              )
            : null,
        ]
      ),
    Row: (props) => row(props, names()),
    Input: (props) =>
      h(VuetifyInput, {
        attrs: {
          ref: props.ref,
          class: names().viewsInput,
          "aria-label": props.label,
          onKeydown: (event: KeyboardEvent): void => {
            if (event.isComposing) return;
            if (event.key === "Enter") {
              event.preventDefault();
              props.onCommit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              props.onCancel();
            }
          },
        },
        value: props.value,
        onChange: props.onChange,
      }),
    Empty: ({ message }) => h(VSheet, { tag: "p" }, () => message),
  };
}
