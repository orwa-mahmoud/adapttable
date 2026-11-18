import {
  defaultFilterRegistry,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  filterOpLabel,
  type FilterTypeRegistry,
  type FilterWidgetKind,
  filterWidgetKind,
  listFilterValues,
  type TableLabels,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  h,
  type MaybeRefOrGetter,
  toValue,
  type VNodeChild,
} from "vue";

import { useInstanceId } from "../componentId";
import { useFilterActionOwner } from "./filterActionOwner";
import {
  type FilterOptionsState,
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
/**
 * A field model under construction: one widget kind adds its controls to it.
 *
 * @public
 */
export interface FilterFieldDraft<TRow> {
  /** The field's options, reading through the field's action owner. */
  readonly options: FilterFieldOptions<TRow>;
  /** The field's id; control ids derive from it. */
  readonly id: string;
  /** The field's caption. */
  readonly label: string;
  /** Add a select control. */
  readonly select: (
    key: string,
    value: string,
    items: FilterSelectProps["options"],
    onChange: FilterSelectProps["onChange"],
    caption?: string
  ) => void;
  /** Add a text, number or date input. */
  readonly input: (
    key: string,
    value: string,
    type: FilterInputProps["type"],
    onChange: FilterInputProps["onChange"]
  ) => void;
  /** Lay the field out as a labelled checkbox group. */
  readonly checkboxGroup: () => void;
  /** Add a checkbox to the field's checkbox group. */
  readonly checkbox: (
    key: string,
    label: string,
    checked: boolean,
    onChange: FilterCheckboxProps["onChange"]
  ) => void;
  /** Report the field's option loading state. */
  readonly loads: (state: FilterOptionsState) => void;
}

/**
 * One widget kind's share of a field model: the state it sets up once, and
 * the controls it adds each time the field model is read.
 *
 * @public
 */
export interface FilterFieldPart {
  /** The widget kinds this part draws. */
  readonly kinds: readonly FilterWidgetKind[];
  /**
   * Set the part up inside the field's setup.
   *
   * @param def - Reads the field's definition.
   * @param source - Reads the field's filter bag.
   * @param choices - The field's option loader, shared between the parts.
   * @returns What the part adds to a field model.
   */
  readonly setup: <TRow>(
    def: () => FilterDef<TRow>,
    source: () => FilterFormSource<TRow>,
    choices: () => ComputedRef<FilterOptionsState>
  ) => (draft: FilterFieldDraft<TRow>) => void;
}

/** The text field: its operator and, when the operator takes one, a value. @public */
export const textFieldPart: FilterFieldPart = {
  kinds: ["text"],
  setup(def, source) {
    const text = useTextFilter(def, source);
    return (draft) => {
      const widget = text.value;
      const { labels } = draft.options;
      draft.select(
        "operator",
        widget.op,
        widget.ops.map((value) => ({
          value,
          label: filterOpLabel(labels, widget.opLabelKeys[value]),
        })),
        (value) => {
          const op = widget.ops.find((item) => item === value);
          if (op) widget.setOp(op);
        },
        labels.operator
      );
      if (widget.needsValue)
        draft.input("value", widget.value, "text", (value) =>
          widget.write(widget.op, value)
        );
    };
  },
};

/** The operator-first number and date range field. @public */
export const rangeFieldPart: FilterFieldPart = {
  kinds: ["dateRange", "numberRange"],
  setup(def, source) {
    const range = useRangeFilter(def, source);
    return (draft) => {
      const widget = range.value;
      const { labels } = draft.options;
      draft.select(
        "operator",
        widget.op ?? "",
        [
          { value: "", label: labels.boolAny },
          ...widget.ops.map((value) => ({
            value,
            label: filterOpLabel(
              labels,
              widget.opLabelKeys[value as keyof typeof widget.opLabelKeys]
            ),
          })),
        ],
        (value) => {
          const op = widget.ops.find((item) => item === value);
          widget.setOp(op);
          widget.write(op, widget.a, widget.b);
        },
        labels.operator
      );
      if (widget.op !== undefined && widget.arity !== "none")
        draft.input("a", widget.a, widget.inputType, (value) =>
          widget.write(widget.op, value, widget.b)
        );
      if (widget.arity === "two")
        draft.input("b", widget.b, widget.inputType, (value) =>
          widget.write(widget.op, widget.a, value)
        );
    };
  },
};

/** The yes/no field. @public */
export const booleanFieldPart: FilterFieldPart = {
  kinds: ["boolean"],
  setup(def, source) {
    const boolean = useBooleanFilter(def, source);
    return (draft) => {
      const widget = boolean.value;
      const { labels } = draft.options;
      draft.select(
        "value",
        widget.choice,
        [
          { value: "", label: labels.boolAny },
          { value: "true", label: labels.boolTrue },
          { value: "false", label: labels.boolFalse },
        ],
        (value) => {
          if (value === "" || value === "true" || value === "false")
            widget.write(value);
        }
      );
    };
  },
};

/** The single-choice field. @public */
export const selectFieldPart: FilterFieldPart = {
  kinds: ["select"],
  setup(_def, _source, choices) {
    const state = choices();
    return (draft) => {
      const { def, source, labels } = draft.options;
      draft.loads(state.value);
      draft.select(
        "value",
        String(source.extra[def.key] ?? ""),
        [{ value: "", label: labels.boolAny }, ...state.value.options],
        (value) => source.setExtra(def.key, value || undefined)
      );
    };
  },
};

/** The multiple-choice field: one checkbox per option. @public */
export const multiSelectFieldPart: FilterFieldPart = {
  kinds: ["multiSelect"],
  setup(_def, _source, choices) {
    const state = choices();
    return (draft) => {
      const { def, source } = draft.options;
      draft.checkboxGroup();
      draft.loads(state.value);
      const selected = listFilterValues(source.extra[def.key]);
      for (const item of state.value.options)
        draft.checkbox(
          item.value,
          item.label,
          selected.includes(item.value),
          (checked) =>
            source.setExtra(
              def.key,
              checked
                ? [...new Set([...selected, item.value])]
                : selected.filter((value) => value !== item.value)
            )
        );
    };
  },
};

/** Every built-in field part: what a field of any kind is drawn with. @public */
export const FILTER_FIELD_PARTS: readonly FilterFieldPart[] = [
  textFieldPart,
  rangeFieldPart,
  booleanFieldPart,
  selectFieldPart,
  multiSelectFieldPart,
];

/** One common field model; kits supply only the native controls. */
export function useFilterField<TRow>(
  input: MaybeRefOrGetter<FilterFieldOptions<TRow>>
) {
  return useFilterFieldWith(input, FILTER_FIELD_PARTS);
}

/**
 * A field model drawn by only the given parts, so the kinds a field never
 * draws stay out of its bundle.
 *
 * @param input - The field's options.
 * @param parts - The widget kinds the field can draw.
 * @returns The field model.
 * @throws When the definition's kind has no part among `parts`.
 *
 * @public
 */
export function useFilterFieldWith<TRow>(
  input: MaybeRefOrGetter<FilterFieldOptions<TRow>>,
  parts: readonly FilterFieldPart[]
) {
  const generated = useInstanceId(() => "");
  if (!generated && !toValue(input).id)
    throw new Error(
      "AdaptTable: a headless filter field needs an explicit id."
    );
  const def = () => toValue(input).def;
  const source = () => toValue(input).source;
  let options: ComputedRef<FilterOptionsState> | undefined;
  const choices = () => (options ??= useFilterOptions(def));
  const fills = parts.map((part) => ({
    kinds: part.kinds,
    fill: part.setup(def, source, choices),
  }));
  const owner = useFilterActionOwner(def, source);
  return computed<FilterFieldModel>(() => {
    const options = { ...toValue(input), source: owner.value.source };
    const id = options.id ?? `adapttable-filter-${generated}`;
    const label = filterLabel(options.def);
    const kind = filterWidgetKind(
      options.def,
      options.registry ?? defaultFilterRegistry
    );
    const fill =
      kind === undefined
        ? undefined
        : fills.find((part) => part.kinds.includes(kind))?.fill;
    if (!fill)
      throw new Error(
        `AdaptTable: filter type "${options.def.type}" needs a registered adapter field renderer.`
      );
    const attrs = (part: string, suffix: string) => ({
      id: `${id}-${suffix}`,
      "aria-label": label,
      "data-adapttable-part": part,
    });
    const controls: FilterFieldControl[] = [];
    let checkboxGroupAttrs: FilterFieldModel["checkboxGroupAttrs"];
    let loading = false;
    let error: unknown;
    fill({
      options,
      id,
      label,
      select(key, value, items, onChange, caption = label) {
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
      },
      input(key, value, type, onChange) {
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
      },
      checkboxGroup() {
        checkboxGroupAttrs = {
          role: "group",
          "aria-labelledby": id,
          "data-adapttable-part": "filter-checkbox-group",
        };
      },
      checkbox(key, caption, checked, onChange) {
        controls.push({
          kind: "checkbox",
          key,
          props: {
            label: caption,
            checked,
            attrs: {
              ...attrs("filter-checkbox", key),
              "aria-label": caption,
            },
            onChange,
          },
        });
      },
      loads(state) {
        loading = state.loading;
        error = state.error;
      },
    });
    return { id, label, controls, checkboxGroupAttrs, loading, error };
  });
}
export interface FilterFieldClassNames {
  readonly filterField?: string;
  readonly filterLabel?: string;
  readonly filterControl?: string;
  readonly filterCheckboxGroup?: string;
  readonly filterOptionsLoading?: string;
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
        style: { display: "grid", minWidth: 0 },
      },
      [node]
    );
  });
  const checkboxFields = model.loading
    ? [
        h(
          "span",
          {
            "data-adapttable-part": "filter-options-loading",
            class: props.classNames?.filterOptionsLoading,
          },
          "…"
        ),
      ]
    : fields;
  return h(
    "div",
    {
      "data-adapttable-part": "filter-field",
      class: [props.className, props.classNames?.filterField],
      "aria-busy": model.loading || undefined,
      style: {
        display: "grid",
        gridTemplateColumns: model.checkboxGroupAttrs
          ? "minmax(0, 1fr)"
          : "repeat(2, minmax(0, 1fr))",
        gap: "8px",
      },
    },
    [
      h(
        "span",
        {
          id: model.id,
          class: props.classNames?.filterLabel,
          "data-adapttable-part": "filter-label",
          style: { gridColumn: "1 / -1" },
        },
        model.label
      ),
      model.checkboxGroupAttrs
        ? h(
            "div",
            {
              ...model.checkboxGroupAttrs,
              class: props.classNames?.filterCheckboxGroup,
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "8px",
              },
            },
            checkboxFields
          )
        : fields,
    ]
  );
}
