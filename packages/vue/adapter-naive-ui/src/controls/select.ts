import type { Attrs } from "@adapttable/vue";
import { NSelect } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  shallowRef,
  useId,
  watch,
  type VNode,
} from "vue";

export interface NaiveSelectControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (value: string) => void;
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
          const host: Element | undefined = select.value?.$el;
          return (
            host?.querySelector<HTMLInputElement>('input[role="combobox"]') ??
            null
          );
        },
      ],
      ([ref, target], _previous, onCleanup) => {
        if (typeof ref !== "function" || !target) return;
        ref(target);
        onCleanup(() => ref(null));
      },
      { immediate: true, flush: "sync" }
    );
    const listId = `adapttable-naive-options-${useId()}`;
    let dismissingOwnMenu = false;
    return () => {
      const control = props.control;
      const {
        ref: _ref,
        id,
        onChange: _onChange,
        onInput: _onInput,
        onKeydown,
        onKeydownCapture,
        ...attrs
      } = control.attrs;
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
          "aria-label": attrs["aria-label"],
          "aria-labelledby": attrs["aria-labelledby"],
          "aria-describedby": attrs["aria-describedby"],
          name: attrs.name,
        },
        menuProps: {
          id: listId,
          role: "listbox",
          "aria-label": attrs["aria-label"],
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
          if (typeof onKeydownCapture === "function") onKeydownCapture(event);
        },
        onKeydown: (event: KeyboardEvent) => {
          if (typeof onKeydown === "function") onKeydown(event);
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
