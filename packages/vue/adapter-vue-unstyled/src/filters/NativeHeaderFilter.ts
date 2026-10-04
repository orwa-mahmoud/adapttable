import { elementRef } from "@adapttable/vue/adapter";
import {
  HeaderFilterChrome,
  type HeaderFilterChromeSlots,
  type HeaderFilterOptions,
  useHeaderFilter,
} from "@adapttable/vue/header-filters";
import { defineComponent, h, mergeProps } from "vue";

import { useClassNames } from "../classNamesContext";
import { NativeFilterField } from "./NativeFilterField";
import { NativeFilterSurface } from "./NativeFilterSurface";

export const NativeHeaderFilter = defineComponent(
  <TRow>(props: HeaderFilterOptions<TRow>) => {
    const names = useClassNames();
    const model = useHeaderFilter(() => props);
    const controls: HeaderFilterChromeSlots<TRow> = {
      Trigger: (control) =>
        h(
          "button",
          mergeProps(control.attrs, {
            type: "button",
            class: names.value.filterHeaderButton,
            ref: elementRef(control.triggerRef),
            "aria-label": control.label,
            "data-active": control.count > 0 ? "" : undefined,
            onPointerdown: control.onPointerDown,
            onClick: control.onClick,
          }),
          control.label
        ),
      Field: (field) => h(NativeFilterField<TRow>, { ...field }),
      Popover: (surface) =>
        h(NativeFilterSurface, {
          ...surface,
          modal: false,
          part: "filter-header-popover",
        }),
    };
    return () => HeaderFilterChrome({ model: model.value, controls });
  },
  {
    name: "NativeHeaderFilter",
    props: [
      "id",
      "def",
      "source",
      "registry",
      "labels",
      "dir",
      "closeOnSelect",
      "className",
    ],
  }
);
