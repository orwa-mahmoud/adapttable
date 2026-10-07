import type { Attrs, ElementRef } from "@adapttable/vue";
import {
  formatMultiDraft,
  readMultiDraft,
  useElementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NSelect, type SelectInst } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  type InputHTMLAttributes,
  shallowRef,
  useId,
  watch,
} from "vue";

import { withoutAttributes } from "../controls/attributes";
import { htmlRoot } from "../controls/elementTarget";

interface ChoiceEditorProps {
  readonly attrs: Attrs;
  readonly draft: string;
  readonly multiple: boolean;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}

/** NSelect owns its open menu; the binding owns editing keys when that menu is closed. */
export const NaiveChoiceEditor = defineComponent(
  (props: ChoiceEditorProps) => {
    const instance = shallowRef<(ComponentPublicInstance & SelectInst) | null>(
      null
    );
    const active = useScopeActivity();
    const show = shallowRef(false);
    const listId = `adapttable-naive-edit-options-${useId()}`;
    watch(
      active,
      (enabled) => {
        if (!enabled) show.value = false;
      },
      { flush: "sync" }
    );
    useElementRef(
      () =>
        active.value && instance.value
          ? htmlRoot(instance.value)?.querySelector<HTMLInputElement>(
              'input[role="combobox"]'
            )
          : null,
      () =>
        typeof props.attrs.ref === "function"
          ? (props.attrs.ref as ElementRef)
          : undefined
    );
    let menuKey = false;
    return () => {
      const attrs = withoutAttributes(props.attrs, [
        "ref",
        "onBlur",
        "onKeydown",
        "id",
        "class",
        "data-adapttable-part",
      ]);
      const inputProps = {
        ...attrs,
        id: props.attrs.id as string | undefined,
        class: props.attrs.class as InputHTMLAttributes["class"],
        "data-adapttable-part": props.attrs["data-adapttable-part"],
        role: "combobox",
        "aria-autocomplete": "list" as const,
        "aria-expanded": show.value,
        "aria-controls": listId,
      };
      return h(NSelect, {
        ref: instance,
        size: "small",
        disabled: props.attrs.disabled === true,
        filterable: true,
        to: false,
        show: active.value && show.value,
        multiple: props.multiple,
        value: props.multiple ? readMultiDraft(props.draft) : props.draft,
        options: [...props.options],
        inputProps,
        menuProps: {
          id: listId,
          role: "listbox",
          "aria-multiselectable": props.multiple || undefined,
        },
        nodeProps: (option) => ({
          role: "option",
          "aria-selected": props.multiple
            ? readMultiDraft(props.draft).includes(String(option.value))
            : option.value === props.draft,
        }),
        "onUpdate:value": (
          value: string | number | (string | number)[] | null
        ) => {
          if (!active.value) return;
          const draft = Array.isArray(value)
            ? formatMultiDraft(value.map(String))
            : String(value ?? "");
          props.onChange(draft);
        },
        "onUpdate:show": (value: boolean) => {
          if (active.value) show.value = value;
        },
        onBlur: () => {
          if (active.value) props.onBlur();
        },
        onKeydownCapture: (event: KeyboardEvent) => {
          menuKey =
            show.value &&
            ["Escape", "Enter", "ArrowUp", "ArrowDown", "Home", "End"].includes(
              event.key
            );
        },
        onKeydown: (event: KeyboardEvent) => {
          if (!active.value) return;
          if (menuKey) {
            event.stopPropagation();
            if (event.key === "Escape") instance.value?.focusInput();
          } else props.onKeyDown(event);
          menuKey = false;
        },
      });
    };
  },
  {
    name: "NaiveChoiceEditor",
    inheritAttrs: false,
    props: [
      "attrs",
      "draft",
      "multiple",
      "options",
      "onChange",
      "onBlur",
      "onKeyDown",
    ],
  }
);
