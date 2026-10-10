/** Recursive AND/OR structure, using only required adapter-native controls. */
import {
  defaultFilterRegistry,
  emptyFilterTree,
  filterTreeCombinatorOptions,
  filterTreeConditionModel,
  isFilterGroup,
  type QueryCondition,
  type QueryFilterGroup,
  resolveLabels,
} from "@adapttable/core";
import type {
  FilterTreeBuilderProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
  FilterTreeSlots,
} from "@adapttable/core/binding";
import {
  computed,
  h,
  type MaybeRefOrGetter,
  toValue,
  type VNodeChild,
} from "vue";

import { useFilterTree } from "./filterModels";
export function useFilterTreeModel<TRow>(
  input: MaybeRefOrGetter<FilterTreeBuilderProps<TRow>>
) {
  const state = useFilterTree(() => ({
    ...toValue(input),
    registry: toValue(input).registry ?? defaultFilterRegistry,
  }));
  return computed(() => ({
    ...toValue(input),
    labels: resolveLabels(toValue(input).labels),
    registry: toValue(input).registry ?? defaultFilterRegistry,
    expanded: state.expanded.value,
    setExpanded: state.setExpanded,
    tree: state.tree.value,
    actions: state.actions.value,
  }));
}
export type FilterTreeModel<TRow> = ReturnType<
  typeof useFilterTreeModel<TRow>
>["value"];
export function FilterTreeChrome<TRow>(props: {
  readonly model: FilterTreeModel<TRow>;
  readonly controls: FilterTreeSlots<VNodeChild>;
}): VNodeChild {
  const { model, controls } = props;
  if (!model.defs.length) return null;
  for (const name of ["Select", "Input", "Button", "Disclosure"] as const)
    if (typeof controls[name] !== "function")
      throw new Error(
        `AdaptTable: FilterTreeChrome requires the ${name} control slot.`
      );
  const names = model.classNames ?? {};
  const labels = model.labels;
  const select = (input: FilterTreeSelectProps) =>
    controls.Select({
      className:
        input.part === "filter-operator"
          ? names.filterOperator
          : names.filterSelect,
      fieldClassName: names.filterField,
      labelClassName: names.filterLabel,
      ...input,
    });
  const field = (input: FilterTreeInputProps) =>
    controls.Input({
      className: names.filterInput,
      fieldClassName: names.filterField,
      labelClassName: names.filterLabel,
      ...input,
    });
  const leaf = (
    condition: QueryCondition,
    path: readonly number[]
  ): VNodeChild => {
    const state = filterTreeConditionModel(
      condition,
      model.defs,
      model.registry,
      labels
    );
    if (!state) return null;
    const change = (value: unknown) =>
      model.actions.replace(path, state.withValue(value));
    const value = state.value;
    const fields: VNodeChild[] = [];
    if (value.kind === "single")
      fields.push(
        field({
          label: labels.value,
          type: value.type,
          value: value.text,
          onChange: (text) => change(value.write(text)),
        })
      );
    else if (value.kind === "between")
      fields.push(
        field({
          label: labels.from,
          type: value.type,
          value: value.a,
          onChange: (text) => change(value.writeA(text)),
        }),
        field({
          label: labels.to,
          type: value.type,
          value: value.b,
          onChange: (text) => change(value.writeB(text)),
        })
      );
    else if (value.kind === "boolean")
      fields.push(
        select({
          label: labels.value,
          part: "filter-select",
          value: value.choice,
          options: value.options,
          onChange: (choice) => change(value.write(choice)),
        })
      );
    else if (value.kind === "relative") {
      fields.push(
        select({
          label: labels.value,
          part: "filter-select",
          value: value.preset,
          options: value.options,
          onChange: (preset) => change(value.writePreset(preset)),
        })
      );
      if (value.counted)
        fields.push(
          field({
            label: labels.value,
            type: "number",
            value: String(value.n),
            onChange: (count) => change(value.writeCount(count)),
          })
        );
    }
    return h(
      "div",
      {
        key: path.join("."),
        "data-adapttable-part": "filter-tree-condition",
        class: names.filterTreeCondition,
      },
      [
        select({
          label: labels.filterField,
          part: "filter-select",
          value: state.def.key,
          options: state.fieldOptions,
          onChange: (key) => {
            const next = state.withField(key);
            if (next) model.actions.replace(path, next);
          },
        }),
        state.opOptions.length
          ? select({
              label: labels.operator,
              part: "filter-operator",
              value: condition.op,
              options: state.opOptions,
              onChange: (op) => model.actions.replace(path, state.withOp(op)),
            })
          : null,
        ...fields,
        controls.Button({
          label: labels.filterRemoveCondition,
          part: "filter-tree-remove",
          className: names.filterTreeRemove,
          onClick: () => model.actions.remove(path),
        }),
      ]
    );
  };
  const group = (
    value: QueryFilterGroup,
    path: readonly number[]
  ): VNodeChild =>
    h(
      "div",
      {
        key: path.join("."),
        role: "group",
        "aria-label": labels.filterTree,
        "data-adapttable-part": "filter-tree-group",
        class: names.filterTreeGroup,
      },
      [
        select({
          label: labels.filterTree,
          part: "filter-operator",
          value: value.combinator,
          options: filterTreeCombinatorOptions(labels),
          onChange: (op) => model.actions.setCombinator(path, op),
        }),
        ...value.conditions.map((child, index) =>
          isFilterGroup(child)
            ? group(child, [...path, index])
            : leaf(child, [...path, index])
        ),
        h(
          "div",
          {
            "data-adapttable-part": "filter-tree-actions",
            class: names.filterTreeActions,
          },
          [
            controls.Button({
              label: labels.filterAddCondition,
              onClick: () => model.actions.addCondition(path),
            }),
            controls.Button({
              label: labels.filterAddGroup,
              onClick: () => model.actions.addGroup(path),
            }),
            path.length
              ? controls.Button({
                  label: labels.filterRemoveGroup,
                  part: "filter-tree-remove",
                  className: names.filterTreeRemove,
                  onClick: () => model.actions.remove(path),
                })
              : null,
          ]
        ),
      ]
    );
  return controls.Disclosure({
    label: labels.filterTree,
    expanded: model.expanded,
    className: names.filterTree,
    summaryClassName: names.filterTreeSummary,
    children: group(model.tree ?? emptyFilterTree(), []),
    onExpandedChange: model.setExpanded,
  });
}
export type {
  FilterTreeBuilderProps,
  FilterTreeButtonProps,
  FilterTreeDisclosureProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
  FilterTreeSlots,
} from "@adapttable/core/binding";
