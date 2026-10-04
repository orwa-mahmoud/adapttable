import {
  defaultFilterRegistry,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  filterOpLabel,
  type FilterTypeRegistry,
  filterWidgetKind,
  listFilterValues,
  type TableLabels,
} from "@adapttable/core";
import {
  computed,
  getCurrentInstance,
  h,
  type MaybeRefOrGetter,
  toValue,
  useId,
  type VNodeChild,
} from "vue";

import { useFilterActionOwner } from "./filterActionOwner";
import {
  useBooleanFilter,
  useFilterOptions,
  useRangeFilter,
  useTextFilter,
} from "./filterModels";
export interface FilterInputProps {
  readonly label: string;
  readonly value: string;
  readonly type: "text" | "number" | "date";
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly onChange: (value: string) => void;
}
export interface FilterSelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly { value: string; label: string }[];
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly onChange: (value: string) => void;
}
export interface FilterCheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly onChange: (checked: boolean) => void;
}
export interface FilterFieldSlots {
  readonly Input: (props: FilterInputProps) => VNodeChild;
  readonly Select: (props: FilterSelectProps) => VNodeChild;
  readonly Checkbox: (props: FilterCheckboxProps) => VNodeChild;
}
export type FilterFieldControl =
  | {
      readonly kind: "input";
      readonly key: string;
      readonly props: FilterInputProps;
    }
  | {
      readonly kind: "select";
      readonly key: string;
      readonly props: FilterSelectProps;
    }
  | {
      readonly kind: "checkbox";
      readonly key: string;
      readonly props: FilterCheckboxProps;
    };
export interface FilterFieldModel {
  readonly id: string;
  readonly label: string;
  readonly controls: readonly FilterFieldControl[];
  readonly checkboxGroupAttrs?: Readonly<Record<string, unknown>>;
  readonly loading: boolean;
  readonly error?: unknown;
}
export interface FilterFieldOptions<TRow> {
  readonly id?: string;
  readonly def: FilterDef<TRow>;
  readonly source: FilterFormSource<TRow>;
  readonly labels: Required<TableLabels>;
  readonly registry?: FilterTypeRegistry;
}
/** One common field model; kits supply only the native controls. */
export function useFilterField<TRow>(
  input: MaybeRefOrGetter<FilterFieldOptions<TRow>>
) {
  const generated = getCurrentInstance() ? useId() : undefined;
  if (!generated && !toValue(input).id)
    throw new Error(
      "AdaptTable: a headless filter field needs an explicit id."
    );
  const def = () => toValue(input).def;
  const source = () => toValue(input).source;
  const text = useTextFilter(def, source);
  const range = useRangeFilter(def, source);
  const boolean = useBooleanFilter(def, source);
  const choices = useFilterOptions(def);
  const owner = useFilterActionOwner(def, source);
  return computed<FilterFieldModel>(() => {
    const options = { ...toValue(input), source: owner.value.source };
    const id = options.id ?? `adapttable-filter-${generated}`;
    const label = filterLabel(options.def);
    const kind = filterWidgetKind(
      options.def,
      options.registry ?? defaultFilterRegistry
    );
    const attrs = (part: string, suffix: string) => ({
      id: `${id}-${suffix}`,
      "aria-label": label,
      "data-adapttable-part": part,
    });
    const controls: FilterFieldControl[] = [];
    let checkboxGroupAttrs: FilterFieldModel["checkboxGroupAttrs"];
    const select = (
      key: string,
      value: string,
      items: FilterSelectProps["options"],
      onChange: FilterSelectProps["onChange"],
      caption = label
    ) => {
      controls.push({
        kind: "select",
        key,
        props: {
          label: caption,
          value,
          options: items,
          attrs: {
            ...attrs(
              key === "operator" ? "filter-operator" : "filter-select",
              key
            ),
            "aria-label": caption,
          },
          onChange,
        },
      });
    };
    const field = (
      key: string,
      value: string,
      type: FilterInputProps["type"],
      onChange: FilterInputProps["onChange"]
    ) => {
      controls.push({
        kind: "input",
        key,
        props: {
          label,
          value,
          type,
          attrs: attrs("filter-input", key),
          onChange,
        },
      });
    };
    if (kind === "text") {
      const widget = text.value;
      select(
        "operator",
        widget.op,
        widget.ops.map((value) => ({
          value,
          label: filterOpLabel(options.labels, widget.opLabelKeys[value]),
        })),
        (value) => {
          const op = widget.ops.find((item) => item === value);
          if (op) widget.setOp(op);
        },
        options.labels.operator
      );
      if (widget.needsValue)
        field("value", widget.value, "text", (value) =>
          widget.write(widget.op, value)
        );
    } else if (kind === "numberRange" || kind === "dateRange") {
      const widget = range.value;
      select(
        "operator",
        widget.op ?? "",
        [
          { value: "", label: options.labels.boolAny },
          ...widget.ops.map((value) => ({
            value,
            label: filterOpLabel(
              options.labels,
              widget.opLabelKeys[value as keyof typeof widget.opLabelKeys]
            ),
          })),
        ],
        (value) => {
          const op = widget.ops.find((item) => item === value);
          widget.setOp(op);
          widget.write(op, widget.a, widget.b);
        },
        options.labels.operator
      );
      if (widget.op !== undefined && widget.arity !== "none")
        field("a", widget.a, widget.inputType, (value) =>
          widget.write(widget.op, value, widget.b)
        );
      if (widget.arity === "two")
        field("b", widget.b, widget.inputType, (value) =>
          widget.write(widget.op, widget.a, value)
        );
    } else if (kind === "boolean") {
      const widget = boolean.value;
      select(
        "value",
        widget.choice,
        [
          { value: "", label: options.labels.boolAny },
          { value: "true", label: options.labels.boolTrue },
          { value: "false", label: options.labels.boolFalse },
        ],
        (value) => {
          if (value === "" || value === "true" || value === "false")
            widget.write(value);
        }
      );
    } else if (kind === "select") {
      select(
        "value",
        String(options.source.extra[options.def.key] ?? ""),
        [
          { value: "", label: options.labels.boolAny },
          ...choices.value.options,
        ],
        (value) => options.source.setExtra(options.def.key, value || undefined)
      );
    } else if (kind === "multiSelect") {
      checkboxGroupAttrs = {
        role: "group",
        "aria-labelledby": id,
        "data-adapttable-part": "filter-checkbox-group",
      };
      const selected = listFilterValues(options.source.extra[options.def.key]);
      for (const item of choices.value.options)
        controls.push({
          kind: "checkbox",
          key: item.value,
          props: {
            label: item.label,
            checked: selected.includes(item.value),
            attrs: {
              ...attrs("filter-checkbox", item.value),
              "aria-label": item.label,
            },
            onChange: (checked) =>
              options.source.setExtra(
                options.def.key,
                checked
                  ? [...new Set([...selected, item.value])]
                  : selected.filter((value) => value !== item.value)
              ),
          },
        });
    } else
      throw new Error(
        `AdaptTable: filter type "${options.def.type}" needs a registered adapter field renderer.`
      );
    return {
      id,
      label,
      controls,
      checkboxGroupAttrs,
      loading: choices.value.loading,
      error: choices.value.error,
    };
  });
}
export interface FilterFieldClassNames {
  readonly filterField?: string;
  readonly filterLabel?: string;
  readonly filterControl?: string;
  readonly filterCheckboxGroup?: string;
}
export function FilterFieldChrome(props: {
  readonly classNames?: FilterFieldClassNames;
  readonly model: FilterFieldModel;
  readonly controls: FilterFieldSlots;
  readonly className?: string;
}): VNodeChild {
  const { model, controls } = props;
  const fields = model.controls.map((control) => {
    const slotKey = {
      input: "Input",
      select: "Select",
      checkbox: "Checkbox",
    } as const;
    if (typeof controls[slotKey[control.kind]] !== "function")
      throw new Error(
        `AdaptTable: FilterFieldChrome requires the ${control.kind} control slot.`
      );
    let node: VNodeChild;
    switch (control.kind) {
      case "input":
        node = controls.Input(control.props);
        break;
      case "select":
        node = controls.Select(control.props);
        break;
      case "checkbox":
        node = controls.Checkbox(control.props);
        break;
    }
    return h(
      "div",
      {
        key: control.key,
        class: props.classNames?.filterControl,
        "data-adapttable-part": "filter-control",
      },
      [node]
    );
  });
  return h(
    "div",
    {
      "data-adapttable-part": "filter-field",
      class: [props.className, props.classNames?.filterField],
      "aria-busy": model.loading || undefined,
    },
    [
      h(
        "span",
        {
          id: model.id,
          class: props.classNames?.filterLabel,
          "data-adapttable-part": "filter-label",
        },
        model.label
      ),
      model.checkboxGroupAttrs
        ? h(
            "div",
            {
              ...model.checkboxGroupAttrs,
              class: props.classNames?.filterCheckboxGroup,
            },
            fields
          )
        : fields,
    ]
  );
}
