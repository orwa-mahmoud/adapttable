import type { Attrs, ElementRef } from "@adapttable/vue";
import { NSelect } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  shallowRef,
  useId,
  type VNode,
  watch,
} from "vue";

import { eventHandler, withoutAttributes } from "./attributes";
import { htmlRoot } from "./elementTarget";

export interface NaiveSelectControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (value: string) => void;
}

function textAttribute(attrs: Attrs, name: string): string | undefined {
  const value = attrs[name];
  return typeof value === "string" ? value : undefined;
}

const NaiveSelectControl = defineComponent(
  (props: { readonly control: NaiveSelectControl }) => {
    const show = shallowRef(false);
    const select = shallowRef<ComponentPublicInstance | null>(null);
    watch(
      [
        () => props.control.attrs.ref,
        () => {
          // SelectInst has no native target ref; inputProps.ref is replaced by the kit.
          // Vue's public host and our public inputProps role locate the actual input.
          const host = select.value ? htmlRoot(select.value) : null;
          return (
            host?.querySelector<HTMLInputElement>('input[role="combobox"]') ??
            null
          );
        },
      ],
      ([ref, target], _previous, onCleanup) => {
        if (typeof ref !== "function" || !target) return;
        const receive = ref as ElementRef;
        receive(target);
        onCleanup(() => receive(null));
      },
      { immediate: true, flush: "sync" }
    );
    const listId = `adapttable-naive-options-${useId()}`;
    let dismissingOwnMenu = false;
    return () => {
      const control = props.control;
      const { id, onKeydown, onKeydownCapture, ...nativeAttrs } = control.attrs;
      const attrs = withoutAttributes(nativeAttrs, [
        "ref",
        "onChange",
        "onInput",
      ]);
      const keydown = eventHandler<KeyboardEvent>(onKeydown);
      const keydownCapture = eventHandler<KeyboardEvent>(onKeydownCapture);
      return h(NSelect, {
        ...attrs,
        size: "small",
        filterable: true,
        to: false,
        show: show.value,
        value: control.value,
        options: [...control.options],
        inputProps: {
          id: typeof id === "string" ? id : undefined,
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-expanded": show.value,
          "aria-controls": listId,
          "aria-label": textAttribute(attrs, "aria-label"),
          "aria-labelledby": textAttribute(attrs, "aria-labelledby"),
          "aria-describedby": textAttribute(attrs, "aria-describedby"),
          name: textAttribute(attrs, "name"),
        },
        menuProps: {
          id: listId,
          role: "listbox",
          "aria-label": textAttribute(attrs, "aria-label"),
        },
        nodeProps: (option) => ({
          role: "option",
          "aria-selected": option.value === control.value,
        }),
        "onUpdate:value": (value: string) => control.onChange(value),
        "onUpdate:show": (value: boolean) => {
          show.value = value;
        },
        onKeydownCapture: (event: KeyboardEvent) => {
          dismissingOwnMenu = event.key === "Escape" && show.value;
          keydownCapture?.(event);
        },
        onKeydown: (event: KeyboardEvent) => {
          keydown?.(event);
          if (dismissingOwnMenu) event.stopPropagation();
          dismissingOwnMenu = false;
        },
        ref: select,
      });
    };
  },
  { name: "NaiveSelectControl", props: ["control"] }
);

/** Compound host hooks and native input semantics use public Naive pass-throughs. */
export function naiveSelect(control: NaiveSelectControl): VNode {
  return h(NaiveSelectControl, { control });
}
