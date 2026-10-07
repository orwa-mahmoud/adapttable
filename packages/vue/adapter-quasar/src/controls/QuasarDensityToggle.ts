import {
  type DensityChooserSlots,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QBtnToggle } from "quasar";
import { defineComponent, h, mergeProps, shallowRef, watch } from "vue";

import { quasarAttrs, useQuasarControlRef } from "./controlAttrs";

type DensityControl = Parameters<DensityChooserSlots["Control"]>[0];

/** The two native toggle buttons always reflect the binding-owned value. */
export const QuasarDensityToggle = defineComponent(
  (props: { readonly control: DensityControl }) => {
    const active = useScopeActivity();
    const revision = shallowRef(0);
    watch(active, () => revision.value++, { flush: "sync" });
    const toggle = shallowRef<InstanceType<typeof QBtnToggle> | null>(null);
    useQuasarControlRef(
      () => {
        const element: unknown = toggle.value?.$el;
        return typeof HTMLElement !== "undefined" &&
          element instanceof HTMLElement
          ? element
          : null;
      },
      () => props.control.attrs
    );
    return () => {
      const control = props.control;
      const acquired = revision.value;
      return h(
        QBtnToggle,
        mergeProps(quasarAttrs(control.attrs), {
          ref: toggle,
          role: "group",
          class: "adapttable-quasar-density-toggle",
          modelValue: control.value,
          options: control.options.map((option) => ({ ...option })),
          noCaps: true,
          unelevated: true,
          "onUpdate:modelValue": (value: unknown) => {
            if (
              active.value &&
              revision.value === acquired &&
              props.control === control &&
              (value === "comfortable" || value === "compact")
            )
              control.onChange(value);
          },
        })
      );
    };
  },
  { name: "QuasarDensityToggle", props: ["control"], inheritAttrs: false }
);
