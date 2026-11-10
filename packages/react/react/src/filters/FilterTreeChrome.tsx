/**
 * AND/OR filter-tree layout. Structure only — adapters pass the Select,
 * Input and Button the end user clicks. Core does not draw form controls.
 */
import {
  defaultFilterRegistry,
  type FilterDef,
  filterTreeCombinatorOptions,
  type FilterTreeConditionModel,
  filterTreeConditionModel,
  filterTreeEditorActions,
  type FilterTypeRegistry,
  isFilterGroup,
  type QueryCondition,
  type QueryFilterGroup,
} from "@adapttable/core";
import {
  type FeatureStrings,
  FILTER_LABELS,
  type FilterTreeBuilderProps,
  type FilterTreeClassNames,
  type FilterTreeDisclosureProps as NeutralFilterTreeDisclosureProps,
  type FilterTreeSlots as NeutralFilterTreeSlots,
  resolveFeatureLabels,
} from "@adapttable/core/binding";
import { type CSSProperties, type ReactNode, useState } from "react";

const FILTER_GROUPS = [FILTER_LABELS] as const;

export type {
  FilterTreeBuilderProps,
  FilterTreeButtonProps,
  FilterTreeClassNames,
  FilterTreeInputProps,
  FilterTreeOption,
  FilterTreeSelectProps,
} from "@adapttable/core/binding";

/**
 * Kit disclosure that owns the Advanced section's visible chrome —
 * `@adapttable/core`'s `FilterTreeDisclosureProps` with React children.
 *
 * @public
 */
export type FilterTreeDisclosureProps =
  NeutralFilterTreeDisclosureProps<ReactNode>;

/**
 * Adapter-supplied controls for {@link FilterTreeChrome} — `@adapttable/core`'s
 * `FilterTreeSlots` drawing React nodes.
 *
 * @public
 */
export type FilterTreeSlots = NeutralFilterTreeSlots<ReactNode>;

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

/**
 * Props for {@link FilterTreeChrome}.
 *
 * @public
 */
export interface FilterTreeChromeProps<
  TRow,
> extends FilterTreeBuilderProps<TRow> {
  /** The kit's controls for the builder's fields and buttons. */
  readonly slots: FilterTreeSlots;
}

function ConditionValue<TRow>({
  model,
  labels,
  classNames,
  slots,
  onChange,
}: Readonly<{
  model: FilterTreeConditionModel<TRow>;
  labels: FeatureStrings<typeof FILTER_GROUPS>;
  classNames: FilterTreeClassNames;
  slots: FilterTreeSlots;
  onChange: (value: unknown) => void;
}>) {
  const editor = model.value;
  const Select = slots.Select;
  const Input = slots.Input;
  switch (editor.kind) {
    case "none":
      return null;
    case "boolean":
      return (
        <Select
          label={labels.value}
          value={editor.choice}
          part="filter-select"
          className={classNames.filterSelect}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          options={editor.options}
          onChange={(next) => onChange(editor.write(next))}
        />
      );
    case "relative":
      return (
        <>
          <Select
            label={labels.opRelative}
            value={editor.preset}
            part="filter-select"
            className={classNames.filterSelect}
            fieldClassName={classNames.filterField}
            labelClassName={classNames.filterLabel}
            options={editor.options}
            onChange={(next) => onChange(editor.writePreset(next))}
          />
          {editor.counted ? (
            <Input
              label="N"
              type="number"
              value={String(editor.n)}
              className={classNames.filterInput}
              fieldClassName={classNames.filterField}
              labelClassName={classNames.filterLabel}
              onChange={(next) => onChange(editor.writeCount(next))}
            />
          ) : null}
        </>
      );
    case "between":
      return (
        <>
          <Input
            label={labels.from}
            type={editor.type}
            value={editor.a}
            className={classNames.filterInput}
            fieldClassName={classNames.filterField}
            labelClassName={classNames.filterLabel}
            onChange={(next) => onChange(editor.writeA(next))}
          />
          <Input
            label={labels.to}
            type={editor.type}
            value={editor.b}
            className={classNames.filterInput}
            fieldClassName={classNames.filterField}
            labelClassName={classNames.filterLabel}
            onChange={(next) => onChange(editor.writeB(next))}
          />
        </>
      );
    case "single":
      return (
        <Input
          label={labels.value}
          type={editor.type}
          value={editor.text}
          className={classNames.filterInput}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          onChange={(next) => onChange(editor.write(next))}
        />
      );
  }
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
  labels: FeatureStrings<typeof FILTER_GROUPS>;
  classNames: FilterTreeClassNames;
  registry: FilterTypeRegistry;
  slots: FilterTreeSlots;
  onReplace: (path: readonly number[], next: QueryCondition) => void;
  onRemove: (path: readonly number[]) => void;
}>) {
  const model = filterTreeConditionModel(condition, defs, registry, labels);
  if (!model) return null;
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
        value={model.def.key}
        part="filter-select"
        className={classNames.filterSelect}
        fieldClassName={classNames.filterField}
        labelClassName={classNames.filterLabel}
        options={model.fieldOptions}
        onChange={(key) => {
          const next = model.withField(key);
          if (next) onReplace(path, next);
        }}
      />
      {model.opOptions.length > 0 ? (
        <Select
          label={labels.operator}
          value={condition.op}
          part="filter-operator"
          className={classNames.filterOperator}
          fieldClassName={classNames.filterField}
          labelClassName={classNames.filterLabel}
          options={model.opOptions}
          onChange={(op) => onReplace(path, model.withOp(op))}
        />
      ) : null}
      <ConditionValue
        model={model}
        labels={labels}
        classNames={classNames}
        slots={slots}
        onChange={(value) => onReplace(path, model.withValue(value))}
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
  labels: FeatureStrings<typeof FILTER_GROUPS>;
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
  labels: FeatureStrings<typeof FILTER_GROUPS>;
  classNames: FilterTreeClassNames;
  registry: FilterTypeRegistry;
  slots: FilterTreeSlots;
  onCombinator: (path: readonly number[], next: string) => void;
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
          options={filterTreeCombinatorOptions(labels)}
          onChange={(next) => onCombinator(path, next)}
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
 *
 * @public
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
  const labels = resolveFeatureLabels(labelOverrides, FILTER_GROUPS);
  const tree = source.filterTree;
  const commit = source.setFilterTree;
  const first = defs[0];
  const [expanded, setExpanded] = useState(
    () => defaultExpanded === true || Boolean(tree)
  );
  if (!commit || !first || defs.length === 0) return null;
  const Disclosure = slots.Disclosure;

  const actions = filterTreeEditorActions(tree, commit, first, registry);

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
          onCombinator={actions.setCombinator}
          onAddCondition={actions.addCondition}
          onAddGroup={actions.addGroup}
          onReplace={actions.replace}
          onRemove={actions.remove}
        />
      ) : (
        <GroupActions
          labels={labels}
          classNames={classNames}
          slots={slots}
          onAddCondition={() => actions.addCondition([])}
          onAddGroup={() => actions.addGroup([])}
        />
      )}
    </Disclosure>
  );
}
