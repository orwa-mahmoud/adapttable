import { type DensityChooserSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { NButton, NButtonGroup } from "naive-ui";
import { defineComponent, h, type PropType } from "vue";

type Props = Parameters<DensityChooserSlots["Control"]>[0];

export const NaiveDensityControl = defineComponent(
  (props: Props) => {
    const renderOption = (option: Props["options"][number]) =>
      h(
        NButton,
        {
          key: option.value,
          type: props.value === option.value ? "primary" : "default",
          "aria-pressed": props.value === option.value,
          onClick: (): void => {
            if (props.value !== option.value) props.onChange(option.value);
          },
        },
        () => option.label
      );
    return () =>
      h(
        NButtonGroup,
        {
          ...toVueAttrs(props.attrs),
          role: "group",
        },
        () => props.options.map(renderOption)
      );
  },
  {
    name: "NaiveDensityControl",
    props: {
      attrs: { type: Object as PropType<Props["attrs"]> },
      value: { type: String as PropType<Props["value"]> },
      options: { type: Array as PropType<Props["options"]> },
      onChange: { type: Function as PropType<Props["onChange"]> },
    },
  }
);
