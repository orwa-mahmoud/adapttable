import {
  defaultFilterRegistry,
  headerFilterBooleanOptions,
  headerFilterCellKind,
  headerFilterMultiModel,
  headerFilterRangeModel,
  headerFilterSelectModel,
  renderRegisteredFilter,
} from "@adapttable/core";
import type {
  FilterHeaderControlProps,
  FilterHeaderMultiProps,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
  FilterHeaderSlots as NeutralFilterHeaderSlots,
} from "@adapttable/core/binding";
import {
  computed,
  h,
  type MaybeRefOrGetter,
  toValue,
  type VNodeChild,
} from "vue";

import { renderDisplayValue } from "../displayValue";
import { useFilterActionOwner } from "./filterActionOwner";
import {
  useBooleanFilter,
  useFilterOptions,
  useRangeFilter,
  useTextFilter,
} from "./filterModels";

/** Required kit controls for compact header filtering. */
export type FilterHeaderSlots = NeutralFilterHeaderSlots<VNodeChild>;
/** Compact control options, including the multi-choice menu class. */
export interface FilterHeaderControlOptions<
  TRow,
> extends FilterHeaderControlProps<TRow> {
  readonly menuClassName?: string;
}
/** A compact header control projected from the shared filter models. */
export type FilterHeaderControlModel =
  | { readonly kind: "text"; readonly props: FilterHeaderSearchProps }
  | { readonly kind: "select"; readonly props: FilterHeaderSelectProps }
  | { readonly kind: "multi"; readonly props: FilterHeaderMultiProps }
  | {
      readonly kind: "range";
      readonly className?: string;
      readonly lower: FilterHeaderRangeProps;
      readonly upper?: FilterHeaderRangeProps;
    }
  | { readonly kind: "custom"; readonly content: VNodeChild };

/** Compact filter values and writes share the existing field lifetime. */
export function useFilterHeaderControl<TRow>(
  input: MaybeRefOrGetter<FilterHeaderControlOptions<TRow>>
) {
  const definition = () => toValue(input).def;
  const source = () => toValue(input).source;
  const text = useTextFilter(definition, source);
  const range = useRangeFilter(definition, source);
  const boolean = useBooleanFilter(definition, source);
  const owner = useFilterActionOwner(definition, source);
  const custom = computed(() => {
    const options = toValue(input);
    return renderRegisteredFilter(
      options.def,
      owner.value.source,
      options.labels,
      options.registry ?? defaultFilterRegistry,
      options.className
    );
  });
  const choices = useFilterOptions(() => {
    const options = toValue(input);
    const kind = headerFilterCellKind(
      options.def,
      options.registry ?? defaultFilterRegistry
    );
    return custom.value === undefined && (kind === "select" || kind === "multi")
      ? options.def
      : { ...options.def, options: undefined };
  });
  return computed<FilterHeaderControlModel | undefined>(() => {
    const options = toValue(input);
    const registry = options.registry ?? defaultFilterRegistry;
    const ownedSource = owner.value.source;
    if (custom.value !== undefined)
      return { kind: "custom", content: renderDisplayValue(custom.value) };
    const common = { className: options.className };
    switch (headerFilterCellKind(options.def, registry)) {
      case "text": {
        const widget = text.value;
        return {
          kind: "text",
          props: {
            ...common,
            label: widget.label,
            placeholder: options.labels.search,
            value: widget.value,
            onChange: (value) => widget.write(widget.op, value),
          },
        };
      }
      case "select": {
        const model = headerFilterSelectModel(
          options.def,
          ownedSource,
          choices.value.options,
          options.labels
        );
        return {
          kind: "select",
          props: {
            ...common,
            label: model.label,
            value: model.value,
            options: model.options,
            onChange: model.write,
          },
        };
      }
      case "multi": {
        const model = headerFilterMultiModel(
          options.def,
          ownedSource,
          choices.value.options,
          options.labels
        );
        return {
          kind: "multi",
          props: {
            ...common,
            label: model.label,
            summary: model.summary,
            options: model.options,
            selected: model.selected,
            menuClassName: options.menuClassName,
            onToggle: model.toggle,
          },
        };
      }
      case "boolean": {
        const widget = boolean.value;
        return {
          kind: "select",
          props: {
            ...common,
            label: widget.label,
            value: widget.choice,
            options: headerFilterBooleanOptions(options.labels),
            onChange: (value) => {
              if (value === "" || value === "true" || value === "false")
                widget.write(value);
            },
          },
        };
      }
      case "range": {
        const widget = range.value;
        const model = headerFilterRangeModel(widget);
        return {
          kind: "range",
          ...common,
          lower: {
            label: widget.label,
            type: widget.inputType,
            value: widget.a,
            onChange: model.writeLower,
          },
          upper: model.showUpper
            ? {
                label: widget.label,
                type: widget.inputType,
                value: widget.b,
                onChange: model.writeUpper,
              }
            : undefined,
        };
      }
      case undefined:
        return undefined;
    }
  });
}

/** Structural compact filter content; interactive controls are required slots. */
export function FilterHeaderControlChrome(props: {
  readonly model: FilterHeaderControlModel | undefined;
  readonly controls: FilterHeaderSlots;
}): VNodeChild {
  for (const key of ["Search", "Select", "Range", "Multi"] as const)
    if (typeof props.controls[key] !== "function")
      throw new Error(
        `AdaptTable: FilterHeaderControlChrome requires the ${key} control slot.`
      );
  const model = props.model;
  let content: VNodeChild = null;
  if (model) {
    switch (model.kind) {
      case "text":
        content = props.controls.Search(model.props);
        break;
      case "select":
        content = props.controls.Select(model.props);
        break;
      case "multi":
        content = props.controls.Multi(model.props);
        break;
      case "custom":
        content = model.content;
        break;
      case "range":
        content = h(
          "span",
          {
            "data-adapttable-part": "filter-header-input",
            class: model.className,
          },
          [
            props.controls.Range(model.lower),
            model.upper ? props.controls.Range(model.upper) : null,
          ]
        );
        break;
    }
  }
  return content;
}

export type {
  FilterHeaderClassNames,
  FilterHeaderControlProps,
  FilterHeaderMultiProps,
  FilterHeaderOption,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
} from "@adapttable/core/binding";
