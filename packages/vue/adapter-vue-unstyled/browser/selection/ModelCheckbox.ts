import { defineComponent, h, shallowRef } from "vue";

/** A value-controlled Vue test control with both common checkbox events. */
export const ModelCheckbox = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, required: true },
    indeterminate: { type: Boolean, required: true },
  },
  emits: {
    "update:modelValue": (checked: boolean) => typeof checked === "boolean",
    change: (checked: boolean) => typeof checked === "boolean",
  },
  setup(props, { attrs, emit, expose }) {
    const input = shallowRef<HTMLInputElement | null>(null);
    expose({ input });
    return () =>
      h("input", {
        ...attrs,
        ref: input,
        type: "checkbox",
        checked: props.modelValue,
        indeterminate: props.indeterminate,
        onChange: (event: Event) => {
          const input = event.currentTarget;
          if (!(input instanceof HTMLInputElement)) return;
          const checked = input.checked;
          emit("update:modelValue", checked);
          emit("change", checked);
          // A controlled control displays what its parent accepted.
          input.checked = props.modelValue;
          input.indeterminate = props.indeterminate;
        },
      });
  },
});
