import {
  defaultFilterRegistry,
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldSlots,
  filterLabel,
  filterWidgetKind,
  useFilterField,
} from "@adapttable/vue/filters";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";
import { nativeCheckbox } from "../nativeCheckbox";
import { NativeChecklistFilter } from "./NativeChecklistFilter";

const NativeBasicFilterField = defineComponent(
  <TRow>(props: FilterFieldOptions<TRow>) => {
    const names = useClassNames();
    const model = useFilterField(() => props);
    const controls: FilterFieldSlots = {
      Input: (control) =>
        h("input", {
          ...control.attrs,
          type: control.type,
          value: control.value,
          class: names.value.filterInput,
          onInput: (event: Event) => {
            const element = event.currentTarget as HTMLInputElement;
            control.onChange(element.value);
            element.value = control.value;
          },
        }),
      Select: (control) =>
        h(
          "select",
          {
            ...control.attrs,
            value: control.value,
            class:
              control.attrs["data-adapttable-part"] === "filter-operator"
                ? names.value.filterOperator
                : names.value.filterSelect,
            onChange: (event: Event) => {
              const element = event.currentTarget as HTMLSelectElement;
              control.onChange(element.value);
              element.value = control.value;
            },
          },
          control.options.map((option) =>
            h(
              "option",
              { key: option.value, value: option.value },
              option.label
            )
          )
        ),
      Checkbox: (control) => {
        const { "data-adapttable-part": part, ...attrs } = control.attrs;
        return h(
          "label",
          { "data-adapttable-part": part, class: names.value.filterCheckbox },
          [
            nativeCheckbox({
              ...attrs,
              type: "checkbox",
              checked: control.checked,
              onChange: (event: Event) => {
                control.onChange(
                  (event.currentTarget as HTMLInputElement).checked
                );
              },
            }),
            control.label,
          ]
        );
      },
    };
    return () =>
      FilterFieldChrome({
        model: model.value,
        controls,
        classNames: names.value,
      });
  },
  {
    name: "NativeBasicFilterField",
    props: ["id", "def", "source", "labels", "registry"],
  }
);

/** Route registered widget kinds without starting unused field models or option loads. */
export const NativeFilterField = defineComponent(
  <TRow>(props: FilterFieldOptions<TRow>) => {
    const names = useClassNames();
    return () =>
      filterWidgetKind(props.def, props.registry ?? defaultFilterRegistry) ===
      "checklist"
        ? h(
            "fieldset",
            {
              class: names.value.filterField,
              "data-adapttable-part": "filter-field",
            },
            [
              h(
                "legend",
                {
                  class: names.value.filterLabel,
                  "data-adapttable-part": "filter-label",
                },
                filterLabel(props.def)
              ),
              h(NativeChecklistFilter<TRow>, {
                def: props.def,
                source: props.source,
                labels: props.labels,
                classNames: names.value,
              }),
            ]
          )
        : h(NativeBasicFilterField<TRow>, { ...props });
  },
  {
    name: "NativeFilterField",
    props: ["id", "def", "source", "labels", "registry"],
  }
);
