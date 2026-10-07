import { useScopeActivity } from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import QuasarInput from "../controls/QuasarInput.vue";
import type { QuasarInputControl } from "../controls/types";

/** A retired native field cannot write into a reactivated saved-view owner. */
export const QuasarViewInput = defineComponent(
  (props: { readonly control: QuasarInputControl }) => {
    const active = useScopeActivity();
    return () =>
      h(QuasarInput, {
        control: {
          ...props.control,
          onChange: (value) => {
            if (active.value) props.control.onChange(value);
          },
        },
      });
  },
  { name: "QuasarViewInput", props: ["control"] }
);
