import type { Attrs, ElementRef } from "@adapttable/vue";
import { type InputInst, NInput } from "naive-ui";
import {
  defineComponent,
  h,
  shallowRef,
  type VNode,
  type VNodeChild,
  watch,
} from "vue";

import { eventHandler, withoutAttributes } from "./attributes";

export interface NaiveInputControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly type?: "text" | "number" | "date" | "textarea";
  readonly prefix?: () => VNodeChild;
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
        const receive = ref as ElementRef;
        receive(target);
        onCleanup(() => receive(null));
      },
      { immediate: true, flush: "sync" }
    );
    return () => {
      const control = props.control;
      const { onFocus, onBlur, ...nativeAttrs } = control.attrs;
      const attrs = withoutAttributes(nativeAttrs, [
        "ref",
        "onInput",
        "onChange",
      ]);
      const defaultType = typeof attrs.type === "string" ? attrs.type : "text";
      const inputType = control.type ?? defaultType;
      return h(
        NInput,
        {
          size: "small",
          value: control.value,
          type: inputType === "textarea" ? "textarea" : "text",
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
            type: inputType === "textarea" ? undefined : inputType,
          },
          onFocus: eventHandler<FocusEvent>(onFocus),
          onBlur: eventHandler<FocusEvent>(onBlur),
          "onUpdate:value": (value: string) => control.onChange(value),
          ref: input,
        },
        { prefix: control.prefix }
      );
    };
  },
  { name: "NaiveInputControl", props: ["control"] }
);

/** Native attrs use inputProps; target refs use Naive's exported InputInst. */
export function naiveInput(control: NaiveInputControl): VNode {
  return h(NaiveInputControl, { control });
}
