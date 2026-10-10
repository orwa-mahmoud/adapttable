import type { Attrs, ElementRef } from "@adapttable/vue";
import { useElementRef, useScopeActivity } from "@adapttable/vue/adapter";
import { NInputNumber } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  type PropType,
  shallowRef,
} from "vue";

import { withoutAttributes } from "../controls/attributes";
import { htmlRoot } from "../controls/elementTarget";

interface NumberEditorProps {
  readonly attrs: Attrs;
  readonly draft: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
}

/** The public formatter preserves the binding's raw draft through vendor blur formatting. */
export const NaiveNumberEditor = defineComponent(
  (props: NumberEditorProps) => {
    const active = useScopeActivity();
    const instance = shallowRef<ComponentPublicInstance | null>(null);
    useElementRef(
      () =>
        active.value && instance.value
          ? htmlRoot(instance.value)?.querySelector<HTMLInputElement>(
              'input[role="spinbutton"]'
            )
          : null,
      () =>
        typeof props.attrs.ref === "function"
          ? (props.attrs.ref as ElementRef)
          : undefined
    );
    return () =>
      h(NInputNumber, {
        ref: instance,
        size: "small",
        disabled: props.attrs.disabled === true,
        readonly:
          props.attrs.readonly === true || props.attrs.readOnly === true,
        value:
          props.draft.trim() !== "" && Number.isFinite(Number(props.draft))
            ? Number(props.draft)
            : null,
        format: () => props.draft,
        showButton: false,
        inputProps: {
          ...withoutAttributes(props.attrs, ["ref", "onBlur"]),
          role: "spinbutton",
          onInput: (event: Event) => {
            if (active.value)
              props.onChange((event.currentTarget as HTMLInputElement).value);
          },
        },
        "onUpdate:value": (value: number | null) => {
          if (active.value) props.onChange(value === null ? "" : String(value));
        },
        onBlur: () => {
          if (active.value) props.onBlur();
        },
      });
  },
  {
    name: "NaiveNumberEditor",
    inheritAttrs: false,
    props: {
      attrs: { type: Object as PropType<NumberEditorProps["attrs"]> },
      draft: { type: String as PropType<NumberEditorProps["draft"]> },
      onChange: { type: Function as PropType<NumberEditorProps["onChange"]> },
      onBlur: { type: Function as PropType<NumberEditorProps["onBlur"]> },
    },
  }
);
