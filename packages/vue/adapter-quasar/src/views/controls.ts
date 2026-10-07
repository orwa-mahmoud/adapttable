import {
  type DataTableClassNames,
  managedOverlayPanel,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { QBadge, QCard, QCardSection } from "quasar";
import { h } from "vue";

import { QuasarColumnPanel } from "../columns/QuasarColumnPanel";
import QuasarButton from "../controls/QuasarButton.vue";
import { QuasarViewInput } from "./QuasarViewInput";

export const quasarSavedViewsMenuSlots: SavedViewsMenuSlots = {
  Trigger: ({ attrs, label }) => h(QuasarButton, { attrs, label }),
  Button: ({ attrs, label }) =>
    h(QuasarButton, {
      attrs: {
        ...attrs,
        autofocus: attrs["data-adapttable-part"] === "views-item" || undefined,
      },
      label,
    }),
  Input: (control) =>
    h(QuasarViewInput, {
      control: {
        ...control,
        label:
          typeof control.attrs["aria-label"] === "string"
            ? control.attrs["aria-label"]
            : "",
        attrs: { ...control.attrs, autofocus: true },
      },
    }),
  Panel: managedOverlayPanel((control) => h(QuasarColumnPanel, { control })),
};

type Row = Parameters<SavedViewsPanelSlots["Row"]>[0];
function caption(control: Row, names: DataTableClassNames) {
  return h(
    "div",
    {
      "data-adapttable-part": "saved-view-caption",
      style: control.layout.caption,
    },
    [
      control.isEditing
        ? control.name
        : h(
            QuasarButton,
            {
              attrs: {
                title: control.applyLabel,
                class: names.viewsItem,
                onClick: control.onApply,
              },
            },
            () => control.name
          ),
      control.isDefault
        ? h(
            QBadge,
            { "data-adapttable-part": "saved-view-default" },
            () => control.defaultLabel
          )
        : null,
      control.readOnly
        ? h(
            QBadge,
            { "data-adapttable-part": "saved-view-readonly", outline: true },
            () => control.readOnlyLabel
          )
        : null,
    ]
  );
}
function buttons(control: Row, names: DataTableClassNames) {
  return h(
    "div",
    {
      "data-adapttable-part": "saved-view-controls",
      style: control.layout.controls,
    },
    control.controls.map((action) =>
      h(
        QuasarButton,
        {
          attrs: {
            key: action.key,
            class: names.viewsDelete,
            title: action.label,
            "aria-label": action.label,
            "aria-pressed": action.pressed,
            disabled: !action.onPress,
            onClick: action.onPress,
            style: control.layout.control,
          },
        },
        () => action.icon
      )
    )
  );
}
export function quasarSavedViewsPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (control) =>
      h(
        QCard,
        {
          tag: "section",
          "data-adapttable-part": control["data-adapttable-part"],
          class: ["adapttable-quasar-views-panel", control.className],
        },
        () => [
          h(QCardSection, {}, () =>
            h(
              "h2",
              { "data-adapttable-part": "saved-views-title" },
              control.title
            )
          ),
          control.children,
          control.footer
            ? h(
                QCardSection,
                { "data-adapttable-part": "saved-views-footer" },
                () => control.footer
              )
            : null,
        ]
      ),
    Row: (control) =>
      h(
        QCardSection,
        {
          key: control.viewName,
          "data-adapttable-part": control["data-adapttable-part"],
          class: names().viewsRow,
          style: control.layout.row,
        },
        () => [caption(control, names()), buttons(control, names())]
      ),
    Input: (control) =>
      h(QuasarViewInput, {
        control: {
          value: control.value,
          onChange: control.onChange,
          label: control.label,
          attrs: {
            ref: control.ref,
            class: names().viewsInput,
            "data-adapttable-part": "saved-view-rename-input",
            onKeydown: (event: KeyboardEvent) => {
              if (event.isComposing) return;
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                control.onCommit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                control.onCancel();
              }
            },
          },
        },
      }),
    Empty: ({ message }) => h(QCardSection, {}, () => message),
  };
}
