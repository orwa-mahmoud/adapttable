import {
  type DataTableClassNames,
  managedOverlayPanel,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
  type ViewControlButtonProps,
} from "@adapttable/vue/adapter";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UCard from "@nuxt/ui/components/Card.vue";
import { h, normalizeClass, shallowRef } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtInput from "../controls/NuxtInput.vue";
import NuxtManagedPopover from "../controls/NuxtManagedPopover";

function button({ attrs, label }: ViewControlButtonProps) {
  return h(NuxtButton, { attrs }, () => label);
}

/** Bind the trigger to the vendor's real semantic surface through its ref. */
export function createNuxtSavedViewsMenuSlots(): SavedViewsMenuSlots {
  const surface = shallowRef<HTMLElement | null>(null);
  const receive = (element: HTMLElement | null) => {
    surface.value = element;
  };
  return {
    Trigger: (control) =>
      button({
        ...control,
        attrs: { ...control.attrs, "aria-controls": surface.value?.id },
      }),
    Button: button,
    Input: ({ attrs, value, onChange }) => {
      const { class: className, ...inputAttrs } = attrs;
      return h(NuxtInput, {
        control: {
          attrs: inputAttrs,
          value,
          onChange,
          label:
            typeof attrs["aria-label"] === "string" ? attrs["aria-label"] : "",
        },
        className: normalizeClass(className),
      });
    },
    Panel: managedOverlayPanel((control) =>
      h(NuxtManagedPopover, {
        control,
        className: "adapttable-nuxt-views-popover",
        onElement: receive,
      })
    ),
  };
}

export function nuxtSavedViewsPanelSlots(
  names: () => DataTableClassNames
): SavedViewsPanelSlots {
  return {
    Surface: (props) =>
      h(
        UCard,
        {
          as: "section",
          "data-adapttable-part": props["data-adapttable-part"],
          class: props.className,
        },
        {
          header: () =>
            h(
              "h2",
              { "data-adapttable-part": "saved-views-title" },
              props.title
            ),
          default: () => props.children,
          ...(props.footer
            ? {
                footer: () =>
                  h("span", { "data-adapttable-part": "saved-views-footer" }, [
                    props.footer,
                  ]),
              }
            : {}),
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
                : h(
                    NuxtButton,
                    {
                      attrs: {
                        title: props.applyLabel,
                        class: names().viewsItem,
                        onClick: props.onApply,
                      },
                    },
                    () => props.name
                  ),
              props.isDefault
                ? h(
                    UBadge,
                    {
                      color: "neutral",
                      variant: "subtle",
                      "data-adapttable-part": "saved-view-default",
                    },
                    () => props.defaultLabel
                  )
                : null,
              props.readOnly
                ? h(
                    UBadge,
                    {
                      color: "neutral",
                      variant: "soft",
                      "data-adapttable-part": "saved-view-readonly",
                    },
                    () => props.readOnlyLabel
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
              h(
                NuxtButton,
                {
                  key: control.key,
                  attrs: {
                    class: names().viewsDelete,
                    title: control.label,
                    "aria-label": control.label,
                    "aria-pressed": control.pressed,
                    disabled: !control.onPress,
                    onClick: control.onPress,
                    style: props.layout.control,
                    color: control.danger ? "error" : "neutral",
                  },
                },
                () => control.icon
              )
            )
          ),
        ]
      ),
    Input: (props) =>
      h(NuxtInput, {
        className: names().viewsInput,
        control: {
          attrs: {
            ref: props.ref,
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
          value: props.value,
          label: props.label,
          onChange: props.onChange,
        },
      }),
    Empty: ({ message }) => h("p", message),
  };
}
