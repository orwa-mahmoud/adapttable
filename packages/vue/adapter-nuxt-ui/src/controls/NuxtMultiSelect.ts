import type { Attrs, ElementRef } from "@adapttable/vue";
import {
  formatMultiDraft,
  readMultiDraft,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import USelect from "@nuxt/ui/components/Select.vue";
import { computed, defineComponent, h, type PropType, shallowRef } from "vue";

import { useNuxtControlSize } from "../densityContext";
import { controlRef, withoutAttrs } from "./attrs";
import { useControlElementRef } from "./useControlElementRef";

interface Props {
  readonly attrs: Attrs;
  readonly draft: string;
  readonly label: string;
  readonly options: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly onChange: (value: string) => void;
  readonly focusRef?: ElementRef<HTMLButtonElement>;
  readonly className?: string;
  readonly summary?: string;
  readonly menuClassName?: string;
  readonly menuPart?: string;
}
export default defineComponent(
  (props: Props) => {
    const select = shallowRef<{ triggerRef: HTMLButtonElement | null } | null>(
      null
    );
    const size = useNuxtControlSize();
    const items = computed(() =>
      props.options.map((option, index) => ({
        label: option.label,
        value: index,
      }))
    );
    const selected = computed(() => {
      const values = readMultiDraft(props.draft);
      return props.options.flatMap((option, index) =>
        values.includes(option.value) ? [index] : []
      );
    });
    useControlElementRef(
      () => select.value?.triggerRef ?? null,
      () => [props.focusRef, controlRef<HTMLButtonElement>(props.attrs.ref)]
    );
    function update(value: unknown): void {
      if (!Array.isArray(value)) return;
      const values = value.flatMap((index: unknown) => {
        if (typeof index !== "number") return [];
        const option = props.options[index];
        return option ? [option.value] : [];
      });
      props.onChange(formatMultiDraft(values));
    }
    return () =>
      h(
        USelect,
        {
          ...toVueAttrs({
            ...withoutAttrs(props.attrs, ["ref"]),
            "aria-label": props.label,
          }),
          ref: select,
          items: items.value,
          modelValue: selected.value,
          multiple: true,
          portal: false,
          size: size.value,
          class: props.className,
          ui: { content: props.menuClassName },
          content: {
            ...toVueAttrs({ "data-adapttable-part": props.menuPart }),
          },
          "onUpdate:modelValue": update,
        },
        props.summary === undefined
          ? undefined
          : { default: () => props.summary }
      );
  },
  {
    name: "NuxtMultiSelect",
    inheritAttrs: false,
    props: {
      attrs: { type: Object as PropType<Props["attrs"]> },
      draft: { type: String as PropType<Props["draft"]> },
      label: { type: String as PropType<Props["label"]> },
      options: { type: Array as PropType<Props["options"]> },
      onChange: { type: Function as PropType<Props["onChange"]> },
      focusRef: { type: Function as PropType<Props["focusRef"]> },
      className: { type: String as PropType<Props["className"]> },
      summary: { type: String as PropType<Props["summary"]> },
      menuClassName: { type: String as PropType<Props["menuClassName"]> },
      menuPart: { type: String as PropType<Props["menuPart"]> },
    },
  }
);
