/**
 * AND/OR filter-tree layout. Structure only — adapters pass the Select,
 * Input and Button the end user clicks. Core does not draw form controls.
 */
import { type CSSProperties, type ReactNode, useState } from "react";

import { resolveLabels } from "../labels";
import type { QueryCondition, QueryFilterGroup } from "../source/queryContract";
import { isFilterGroup } from "../source/queryContract";
import type { TableSource } from "../source/TableSource";
import type { TableLabels } from "../types";
import { defaultFilterRegistry } from "./filterBuiltins";
import { type FilterDef, filterLabel } from "./filterDefs";
import { filterOpLabel } from "./filterForm";
import {
  filterTypeDefaultOp,
  filterTypeOps,
  type FilterTypeRegistry,
  filterWidgetKind,
} from "./filterRegistry";
import {
  addFilterTreeCondition,
  addFilterTreeGroup,
  emptyFilterTree,
  removeFilterTreeNode,
  replaceFilterTreeNode,
  setFilterTreeCombinator,
} from "./filterTreeMutations";
import {
  DATE_OP_LABEL_KEYS,
  isBetweenFilterOp,
  isListFilterOp,
  isValuelessFilterOp,
  NUMBER_OP_LABEL_KEYS,
  TEXT_OP_LABEL_KEYS,
} from "./operators";
import {
  joinRelativeToken,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  type RelativePreset,
  splitRelativeToken,
} from "./relativeDates";

/** Class hooks the unstyled adapter maps onto `DataTableClassNames`. */
export interface FilterTreeClassNames {
  filterTree?: string;
  filterTreeGroup?: string;
  filterTreeCondition?: string;
  filterTreeActions?: string;
  filterTreeRemove?: string;
  filterTreeSummary?: string;
  filtersForm?: string;
  filterField?: string;
  filterLabel?: string;
  filterInput?: string;
  filterSelect?: string;
  filterOperator?: string;
}

/** Props for an adapter `FilterTreeBuilder` — no slots on the public API. */
export interface FilterTreeBuilderProps<TRow> {
  readonly defs: readonly FilterDef<TRow>[];
  readonly source: Pick<TableSource<TRow>, "filterTree" | "setFilterTree">;
  readonly labels?: TableLabels;
  readonly classNames?: FilterTreeClassNames;
  readonly registry?: FilterTypeRegistry;
  /** Open Advanced on first paint. Default: open only when a tree already exists. */
  readonly defaultExpanded?: boolean;
}

/** One option in a tree Select. */
export interface FilterTreeOption {
  readonly value: string;
  readonly label: string;
}

/** Kit Select the tree layout calls. */
export interface FilterTreeSelectProps {
  readonly label: string;
  readonly value: string;
  readonly part: string;
  readonly options: readonly FilterTreeOption[];
  readonly className?: string;
  readonly fieldClassName?: string;
  readonly labelClassName?: string;
  readonly onChange: (value: string) => void;
}

/** Kit text/number/date field the tree layout calls. */
export interface FilterTreeInputProps {
  readonly label: string;
  readonly value: string;
  readonly type: "text" | "number" | "date";
  readonly className?: string;
  readonly fieldClassName?: string;
  readonly labelClassName?: string;
  readonly onChange: (value: string) => void;
}

/** Kit button the tree layout calls. */
export interface FilterTreeButtonProps {
  readonly label: string;
  readonly part?: string;
  readonly className?: string;
  readonly onClick: () => void;
}

/** Kit disclosure that owns the Advanced section's visible chrome. */
export interface FilterTreeDisclosureProps {
  readonly label: string;
  readonly expanded: boolean;
  readonly className?: string;
  readonly summaryClassName?: string;
  readonly children: ReactNode;
  readonly onExpandedChange: (expanded: boolean) => void;
}

/** Adapter-supplied controls for {@link FilterTreeChrome}. */
export interface FilterTreeSlots {
  readonly Select: (props: FilterTreeSelectProps) => ReactNode;
  readonly Input: (props: FilterTreeInputProps) => ReactNode;
  readonly Button: (props: FilterTreeButtonProps) => ReactNode;
  readonly Disclosure: (props: FilterTreeDisclosureProps) => ReactNode;
}

/** One compact condition — field, operator, value, remove on a wrapping row. */
const TREE_ROW: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: 8,
  minWidth: 0,
};

/** Nested groups and the Advanced shell stack rows, they do not list fields. */
const TREE_STACK: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
};

const TREE_GROUP_ROOT: CSSProperties = {
  ...TREE_STACK,
  position: "relative",
  margin: 0,
  padding: 0,
  border: "none",
  minInlineSize: 0,
};

/** Nested groups sit on a rail so AND/OR depth is visible. */
const TREE_GROUP_NESTED: CSSProperties = {
  ...TREE_STACK,
  position: "relative",
  marginBlockStart: 4,
  marginInlineStart: 16,
  marginInlineEnd: 0,
  paddingBlock: 8,
  paddingInlineStart: 12,
  border: "none",
  borderInlineStart:
    "2px solid color-mix(in srgb, currentColor 22%, transparent)",
  backgroundColor: "color-mix(in srgb, currentColor 5%, transparent)",
  minInlineSize: 0,
};

const TREE_LEGEND_HIDDEN: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Props for {@link FilterTreeChrome}. */
export interface FilterTreeChromeProps<
  TRow,
> extends FilterTreeBuilderProps<TRow> {
  readonly slots: FilterTreeSlots;
}

function opsFor<TRow>(
  def: FilterDef<TRow>,
  registry: FilterTypeRegistry
): readonly string[] {
  return filterTypeOps(def, registry);
}

function opLabelKey(
  widget: string | undefined,
  op: string
): keyof TableLabels | undefined {
  if (widget === "text" && op in TEXT_OP_LABEL_KEYS) {
    return TEXT_OP_LABEL_KEYS[op as keyof typeof TEXT_OP_LABEL_KEYS];
  }
  if (widget === "numberRange" && op in NUMBER_OP_LABEL_KEYS) {
    return NUMBER_OP_LABEL_KEYS[op as keyof typeof NUMBER_OP_LABEL_KEYS];
  }
  if (widget === "dateRange" && op in DATE_OP_LABEL_KEYS) {
    return DATE_OP_LABEL_KEYS[op as keyof typeof DATE_OP_LABEL_KEYS];
  }
  return undefined;
}

function newCondition<TRow>(
  def: FilterDef<TRow>,
  registry: FilterTypeRegistry
): QueryCondition {
  return { key: def.key, op: filterTypeDefaultOp(def, registry) };
}

function inputTypeFor(
  widget: string | undefined,
  op: string
): "text" | "number" | "date" {
  if (op === "relative" || isListFilterOp(op)) return "text";
  if (widget === "numberRange") return "number";
  if (widget === "dateRange") return "date";
  return "text";
}

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function pairOf(value: unknown): { a: string; b: string } {
  if (Array.isArray(value)) {
    return { a: asText(value[0]), b: asText(value[1]) };
  }
  return { a: asText(value), b: "" };
}

function ConditionValue<TRow>({
  def,
  condition,
  labels,
  classNames,
  registry,
  slots,
  onChange,
}: Readonly<{
  def: FilterDef<TRow>;
  condition: QueryCondition;
  labels: Required<TableLabels>;
  classNames: FilterTreeClassNames;
  registry: FilterTypeRegistry;
  slots: FilterTreeSlots;
  onChange: (value: unknown) => void;
}>) {
  if (isValuelessFilterOp(condition.op)) return null;
  if (filterWidgetKind(def, registry) === "boolean") {
    const choice =
      condition.value === false || condition.value === "false"
        ? "false"
        : "true";
    const Select = slots.Select;
    return (
      <Select
        label={labels.value}
        value={choice}
        part="filter-select"
        className={classNames.filterSelect}
        fieldClassName={classNames.filterField}
        labelClassName={classNames.filterLabel}
        options={[
          { value: "true", label: labels.boolTrue },
          { value: "false", label: labels.boolFalse },
        ]}
        onChange={(next) => onChange(next === "true")}
      />
    );
  }
  if (condition.op === "relative") {
    const token =
      typeof condition.value === "string" ? condition.value : "today";
    const { preset, n } = splitRelativeToken(token);
    const counted = preset === "last" || preset === "next";
    const Select = slots.Select;
    const Input = slots.Input;
    return (
      <>
        <Select
          label={labels.opRelative}
          value={preset}
          part="filter-select"
          className={classNames.filterSelect}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          options={RELATIVE_PRESETS.map((item) => ({
            value: item,
            label: labels[RELATIVE_PRESET_LABEL_KEYS[item]],
          }))}
          onChange={(next) =>
            onChange(joinRelativeToken(next as RelativePreset, n))
          }
        />
        {counted ? (
          <Input
            label="N"
            type="number"
            value={String(n)}
            className={classNames.filterInput}
            fieldClassName={classNames.filterField}
            labelClassName={classNames.filterLabel}
            onChange={(next) =>
              onChange(joinRelativeToken(preset, Number(next) || 1))
            }
          />
        ) : null}
      </>
    );
  }
  const type = inputTypeFor(filterWidgetKind(def, registry), condition.op);
  if (isBetweenFilterOp(condition.op)) {
    const { a, b } = pairOf(condition.value);
    const Input = slots.Input;
    return (
      <>
        <Input
          label={labels.from}
          type={type}
          value={a}
          className={classNames.filterInput}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          onChange={(next) => onChange([next, b])}
        />
        <Input
          label={labels.to}
          type={type}
          value={b}
          className={classNames.filterInput}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          onChange={(next) => onChange([a, next])}
        />
      </>
    );
  }
  const text = Array.isArray(condition.value)
    ? condition.value.map(asText).join(",")
    : asText(condition.value);
  const Input = slots.Input;
  return (
    <Input
      label={labels.value}
      type={type}
      value={text}
      className={classNames.filterInput}
      fieldClassName={classNames.filterField}
      labelClassName={classNames.filterLabel}
      onChange={(next) =>
        onChange(isListFilterOp(condition.op) ? next.split(",") : next)
      }
    />
  );
}

function ConditionRow<TRow>({
  condition,
  path,
  defs,
  labels,
  classNames,
  registry,
  slots,
  onReplace,
  onRemove,
}: Readonly<{
  condition: QueryCondition;
  path: readonly number[];
  defs: readonly FilterDef<TRow>[];
  labels: Required<TableLabels>;
  classNames: FilterTreeClassNames;
  registry: FilterTypeRegistry;
  slots: FilterTreeSlots;
  onReplace: (path: readonly number[], next: QueryCondition) => void;
  onRemove: (path: readonly number[]) => void;
}>) {
  const def = defs.find((item) => item.key === condition.key) ?? defs[0];
  if (!def) return null;
  const ops = opsFor(def, registry);
  const Select = slots.Select;
  const Button = slots.Button;
  return (
    <div
      data-adapttable-part="filter-tree-condition"
      className={classNames.filterTreeCondition}
      style={TREE_ROW}
    >
      <Select
        label={labels.filterField}
        value={def.key}
        part="filter-select"
        className={classNames.filterSelect}
        fieldClassName={classNames.filterField}
        labelClassName={classNames.filterLabel}
        options={defs.map((item) => ({
          value: item.key,
          label: filterLabel(item),
        }))}
        onChange={(key) => {
          const next = defs.find((item) => item.key === key);
          if (next) onReplace(path, newCondition(next, registry));
        }}
      />
      {ops.length > 1 ? (
        <Select
          label={labels.operator}
          value={condition.op}
          part="filter-operator"
          className={classNames.filterOperator}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          options={ops.map((op) => {
            const key = opLabelKey(filterWidgetKind(def, registry), op);
            return {
              value: op,
              label: key ? filterOpLabel(labels, key) : op,
            };
          })}
          onChange={(op) =>
            onReplace(path, { ...condition, op, value: undefined })
          }
        />
      ) : null}
      <ConditionValue
        def={def}
        condition={condition}
        labels={labels}
        classNames={classNames}
        registry={registry}
        slots={slots}
        onChange={(value) => onReplace(path, { ...condition, value })}
      />
      <Button
        label={labels.filterRemoveCondition}
        part="filter-tree-remove"
        className={classNames.filterTreeRemove}
        onClick={() => onRemove(path)}
      />
    </div>
  );
}

function GroupActions({
  labels,
  classNames,
  slots,
  onAddCondition,
  onAddGroup,
}: Readonly<{
  labels: Required<TableLabels>;
  classNames: FilterTreeClassNames;
  slots: FilterTreeSlots;
  onAddCondition: () => void;
  onAddGroup: () => void;
}>) {
  const Button = slots.Button;
  return (
    <div
      data-adapttable-part="filter-tree-actions"
      className={classNames.filterTreeActions}
      style={TREE_ROW}
    >
      <Button label={labels.filterAddCondition} onClick={onAddCondition} />
      <Button label={labels.filterAddGroup} onClick={onAddGroup} />
    </div>
  );
}

function GroupView<TRow>({
  group,
  path,
  defs,
  labels,
  classNames,
  registry,
  slots,
  onCombinator,
  onAddCondition,
  onAddGroup,
  onReplace,
  onRemove,
}: Readonly<{
  group: QueryFilterGroup;
  path: readonly number[];
  defs: readonly FilterDef<TRow>[];
  labels: Required<TableLabels>;
  classNames: FilterTreeClassNames;
  registry: FilterTypeRegistry;
  slots: FilterTreeSlots;
  onCombinator: (path: readonly number[], next: "and" | "or") => void;
  onAddCondition: (path: readonly number[]) => void;
  onAddGroup: (path: readonly number[]) => void;
  onReplace: (path: readonly number[], next: QueryCondition) => void;
  onRemove: (path: readonly number[]) => void;
}>) {
  const Select = slots.Select;
  const Button = slots.Button;
  return (
    <fieldset
      data-adapttable-part="filter-tree-group"
      data-depth={path.length}
      className={classNames.filterTreeGroup}
      style={path.length > 0 ? TREE_GROUP_NESTED : TREE_GROUP_ROOT}
    >
      <legend style={TREE_LEGEND_HIDDEN}>
        {group.combinator === "or"
          ? labels.filterCombinatorOr
          : labels.filterCombinatorAnd}
      </legend>
      <div style={TREE_ROW}>
        <Select
          label={labels.filterTree}
          value={group.combinator}
          part="filter-operator"
          className={classNames.filterOperator}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          options={[
            { value: "and", label: labels.filterCombinatorAnd },
            { value: "or", label: labels.filterCombinatorOr },
          ]}
          onChange={(next) => onCombinator(path, next === "or" ? "or" : "and")}
        />
        {path.length > 0 ? (
          <Button
            label={labels.filterRemoveGroup}
            part="filter-tree-remove"
            className={classNames.filterTreeRemove}
            onClick={() => onRemove(path)}
          />
        ) : null}
      </div>
      {group.conditions.map((node, index) => {
        const childPath = [...path, index];
        if (isFilterGroup(node)) {
          return (
            <GroupView
              key={childPath.join(".")}
              group={node}
              path={childPath}
              defs={defs}
              labels={labels}
              classNames={classNames}
              registry={registry}
              slots={slots}
              onCombinator={onCombinator}
              onAddCondition={onAddCondition}
              onAddGroup={onAddGroup}
              onReplace={onReplace}
              onRemove={onRemove}
            />
          );
        }
        return (
          <ConditionRow
            key={childPath.join(".")}
            condition={node}
            path={childPath}
            defs={defs}
            labels={labels}
            classNames={classNames}
            registry={registry}
            slots={slots}
            onReplace={onReplace}
            onRemove={onRemove}
          />
        );
      })}
      <GroupActions
        labels={labels}
        classNames={classNames}
        slots={slots}
        onAddCondition={() => onAddCondition(path)}
        onAddGroup={() => onAddGroup(path)}
      />
    </fieldset>
  );
}

/**
 * Recursive AND/OR layout over `QueryFilterGroup`. Writes the
 * versioned `ft` param through `source.setFilterTree`. Adapters supply
 * the kit controls via {@link FilterTreeSlots}.
 */
export function FilterTreeChrome<TRow>({
  defs,
  source,
  labels: labelOverrides,
  classNames = {},
  registry = defaultFilterRegistry,
  slots,
  defaultExpanded,
}: Readonly<FilterTreeChromeProps<TRow>>) {
  const labels = resolveLabels(labelOverrides);
  const tree = source.filterTree;
  const commit = source.setFilterTree;
  const first = defs[0];
  const [expanded, setExpanded] = useState(
    () => defaultExpanded === true || Boolean(tree)
  );
  if (!commit || !first || defs.length === 0) return null;
  const Disclosure = slots.Disclosure;

  const onAddCondition = (path: readonly number[]) => {
    commit(addFilterTreeCondition(tree, path, newCondition(first, registry)));
  };
  const onAddGroup = (path: readonly number[]) => {
    commit(addFilterTreeGroup(tree ?? emptyFilterTree(), path));
  };

  return (
    <Disclosure
      label={labels.filterTree}
      expanded={expanded}
      className={classNames.filterTree}
      summaryClassName={classNames.filterTreeSummary}
      onExpandedChange={setExpanded}
    >
      {tree ? (
        <GroupView
          group={tree}
          path={[]}
          defs={defs}
          labels={labels}
          classNames={classNames}
          registry={registry}
          slots={slots}
          onCombinator={(path, next) =>
            commit(setFilterTreeCombinator(tree, path, next))
          }
          onAddCondition={onAddCondition}
          onAddGroup={onAddGroup}
          onReplace={(path, next) =>
            commit(replaceFilterTreeNode(tree, path, next))
          }
          onRemove={(path) => commit(removeFilterTreeNode(tree, path))}
        />
      ) : (
        <GroupActions
          labels={labels}
          classNames={classNames}
          slots={slots}
          onAddCondition={() => onAddCondition([])}
          onAddGroup={() => onAddGroup([])}
        />
      )}
    </Disclosure>
  );
}
