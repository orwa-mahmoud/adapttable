import { type DensityChooserSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { NButton, NButtonGroup } from "naive-ui";
import { defineComponent, h } from "vue";

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
    props: ["attrs", "value", "options", "onChange"],
  }
);
