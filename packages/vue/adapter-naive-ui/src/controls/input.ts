import type { Attrs } from "@adapttable/vue";
import { type InputInst, NInput } from "naive-ui";
import { defineComponent, h, shallowRef, watch, type VNode } from "vue";

export interface NaiveInputControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly type?: "text" | "number" | "date" | "textarea";
  readonly onChange: (value: string) => void;
}

const NaiveInputControl = defineComponent(
  (props: { readonly control: NaiveInputControl }) => {
    const input = shallowRef<InputInst | null>(null);
    watch(
      [
        () => props.control.attrs.ref,
        () =>
          props.control.type === "textarea"
            ? input.value?.textareaElRef
            : input.value?.inputElRef,
      ],
      ([ref, target], _previous, onCleanup) => {
        if (typeof ref !== "function" || !target) return;
        ref(target);
        onCleanup(() => ref(null));
      },
      { immediate: true, flush: "sync" }
    );
    return () => {
      const control = props.control;
      const {
        ref: _ref,
        onInput: _onInput,
        onChange: _onChange,
        onFocus,
        onBlur,
        ...attrs
      } = control.attrs;
      return h(NInput, {
        size: "small",
        value: control.value,
        type: control.type === "textarea" ? "textarea" : "text",
        disabled: attrs.disabled === true,
        readonly: attrs.readonly === true || attrs.readOnly === true,
        autofocus: attrs.autofocus === true || attrs.autoFocus === true,
        maxlength:
          typeof attrs.maxlength === "number" ||
          typeof attrs.maxlength === "string"
            ? attrs.maxlength
            : undefined,
        minlength:
          typeof attrs.minlength === "number" ||
          typeof attrs.minlength === "string"
            ? attrs.minlength
            : undefined,
        placeholder:
          typeof attrs.placeholder === "string" ? attrs.placeholder : "",
        inputProps: {
          ...attrs,
          type:
            control.type === "textarea" ? undefined : (control.type ?? "text"),
        },
        onFocus:
          typeof onFocus === "function"
            ? (event: FocusEvent) => onFocus(event)
            : undefined,
        onBlur:
          typeof onBlur === "function"
            ? (event: FocusEvent) => onBlur(event)
            : undefined,
        "onUpdate:value": (value: string) => control.onChange(value),
        ref: input,
      });
    };
  },
  { name: "NaiveInputControl", props: ["control"] }
);

/** Native attrs use inputProps; target refs use Naive's exported InputInst. */
export function naiveInput(control: NaiveInputControl): VNode {
  return h(NaiveInputControl, { control });
}
