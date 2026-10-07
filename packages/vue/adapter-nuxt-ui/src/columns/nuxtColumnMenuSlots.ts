import {
  type ColumnMenuButtonProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
  mergeVueAttrs,
} from "@adapttable/vue/adapter";
import { h, normalizeClass, shallowRef } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtInput from "../controls/NuxtInput.vue";
import NuxtManagedPopover from "../controls/NuxtManagedPopover";
import NuxtSelect from "../controls/NuxtSelect.vue";

const glyphs = {
  grip: "⠿",
  visible: "◉",
  hidden: "○",
  pin: "⌖",
  more: "⋯",
  rename: "✎",
};
function button(control: ColumnMenuButtonProps) {
  return h(
    NuxtButton,
    {
      attrs: mergeVueAttrs(
        { "aria-label": control.label, title: control.label },
        control.attrs
      ),
    },
    () =>
      control.icon
        ? h("span", { "aria-hidden": true }, glyphs[control.icon])
        : control.label
  );
}
function choice(
  control: Parameters<ColumnMenuSlots["Choice"]>[0],
  portal: boolean | HTMLElement
) {
  return h(NuxtSelect, {
    portal,
    control: {
      ...control,
      label:
        typeof control.attrs["aria-label"] === "string"
          ? control.attrs["aria-label"]
          : "",
    },
  });
}
export const nuxtColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: (control) => {
    const { class: className, ...attrs } = control.attrs;
    const label =
      typeof attrs["aria-label"] === "string" ? attrs["aria-label"] : "";
    return h(NuxtInput, {
      control: {
        attrs,
        value: control.value,
        onChange: control.onChange,
        label,
        type: attrs.type === "search" ? "search" : "text",
      },
      className: normalizeClass(className),
    });
  },
  Choice: (control) => choice(control, true),
  Panel: managedOverlayPanel((control) =>
    h(NuxtManagedPopover, {
      control,
      className: "adapttable-nuxt-column-popover",
    })
  ),
};

/** Adapt the vendor-owned surface ID through its public native-element ref. */
export function createNuxtColumnMenuSlots(
  container: () => HTMLElement | undefined
): ColumnMenuSlots {
  const surface = shallowRef<HTMLElement | null>(null);
  const receive = (element: HTMLElement | null) => {
    surface.value = element;
  };
  return {
    ...nuxtColumnMenuSlots,
    Choice: (control) => choice(control, container() ?? true),
    Trigger: (control) =>
      button({
        ...control,
        attrs: {
          ...control.attrs,
          "aria-controls": surface.value?.id,
        },
      }),
    Panel: managedOverlayPanel((control) =>
      h(NuxtManagedPopover, {
        control,
        onElement: receive,
        className: "adapttable-nuxt-column-popover",
      })
    ),
  };
}
