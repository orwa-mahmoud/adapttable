import {
  managedOverlayPanel,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
} from "@adapttable/vue/adapter";
import { NCard, NFlex, NTag, NText } from "naive-ui";
import { h } from "vue";

import { NaiveManagedPopover } from "../columns/NaiveManagedPopover";
import { naiveButton } from "../controls/button";
import { naiveInput } from "../controls/input";
import type { DataTableClassNames } from "../types";

type Row = Parameters<SavedViewsPanelSlots["Row"]>[0];
function caption(props: Row, names: DataTableClassNames) {
  return h(
    "div",
    {
      "data-adapttable-part": "saved-view-caption",
      style: props.layout.caption,
    },
    [
      props.isEditing
        ? props.name
        : naiveButton(
            {
              title: props.applyLabel,
              class: names.viewsItem,
              onClick: props.onApply,
            },
            props.name
          ),
      props.isDefault
        ? h(
            NTag,
            { "data-adapttable-part": "saved-view-default" },
            { default: () => props.defaultLabel }
          )
        : null,
      props.readOnly
        ? h(
            NTag,
            { "data-adapttable-part": "saved-view-readonly" },
            { default: () => props.readOnlyLabel }
          )
        : null,
    ]
  );
}
function controls(props: Row, names: DataTableClassNames) {
  return h(
    "div",
    {
      "data-adapttable-part": "saved-view-controls",
      style: props.layout.controls,
    },
    props.controls.map((control) =>
      naiveButton(
        {
          key: control.key,
          class: names.viewsDelete,
          title: control.label,
          "aria-label": control.label,
          "aria-pressed": control.pressed,
          disabled: !control.onPress,
          onClick: control.onPress,
          style: props.layout.control,
        },
        control.icon
      )
    )
  );
}
export const naiveSavedViewsMenuSlots: SavedViewsMenuSlots = {
  Trigger: ({ attrs, label }) => naiveButton(attrs, label),
  Button: ({ attrs, label }) => naiveButton(attrs, label),
  Input: naiveInput,
  Panel: managedOverlayPanel((control) => h(NaiveManagedPopover, { control })),
};
export function naiveSavedViewsPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (props) =>
      h(
        NCard,
        {
          tag: "section",
          size: "small",
          "data-adapttable-part": props["data-adapttable-part"],
          class: props.className,
        },
        {
          header: () =>
            h(
              NText,
              { "data-adapttable-part": "saved-views-title" },
              { default: () => props.title }
            ),
          default: () => props.children,
          footer: props.footer
            ? () =>
                h("span", { "data-adapttable-part": "saved-views-footer" }, [
                  props.footer,
                ])
            : undefined,
        }
      ),
    Row: (props) =>
      h(
        NFlex,
        {
          key: props.viewName,
          class: names().viewsRow,
          "data-adapttable-part": props["data-adapttable-part"],
          style: props.layout.row,
        },
        { default: () => [caption(props, names()), controls(props, names())] }
      ),
    Input: (props) =>
      naiveInput({
        value: props.value,
        onChange: props.onChange,
        attrs: {
          ref: props.ref,
          class: names().viewsInput,
          "aria-label": props.label,
          onKeydown: (event: KeyboardEvent) => {
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
      }),
    Empty: ({ message }) => h(NText, { depth: 3 }, { default: () => message }),
  };
}
