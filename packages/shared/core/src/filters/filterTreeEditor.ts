/**
 * The AND/OR filter-tree builder's model: what each condition row offers,
 * which value editor its operator needs, what an edit writes, and the chip a
 * condition reads as.
 *
 * Bindings draw the rows with their kit's Select, Input and Button; every
 * choice those controls offer, and every value they write back, comes from
 * here. The builder and the chips read operators through the same registry
 * widget, so a custom filter type labels its operators the same way in both.
 */
import type { QueryCondition, QueryFilterGroup } from "../source/queryContract";
import type { TableLabels } from "../types";
import { type FilterDef, filterLabel } from "./filterDefs";
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
import { filterOpLabel } from "./filterWidgets";
import {
  DATE_OP_LABEL_KEYS,
  formatFilterChip,
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
  relativeTokenLabel,
  splitRelativeToken,
} from "./relativeDates";

/**
 * One option in a filter-tree choice control.
 *
 * @public
 */
export interface FilterTreeOption {
  /** Value stored when this option is chosen. */
  readonly value: string;
  /** Caption shown for the option. */
  readonly label: string;
}

/**
 * An operator's caption for a filter widget: its localized label when the
 * widget knows the operator, else the operator itself.
 *
 * @param widget - The registry widget the def renders with.
 * @param op - The operator.
 * @param labels - Fully resolved labels.
 * @returns The caption.
 *
 * @public
 */
export function filterTreeOpLabel(
  widget: string | undefined,
  op: string,
  labels: Required<TableLabels>
): string {
  if (widget === "text" && op in TEXT_OP_LABEL_KEYS) {
    return filterOpLabel(
      labels,
      TEXT_OP_LABEL_KEYS[op as keyof typeof TEXT_OP_LABEL_KEYS]
    );
  }
  if (widget === "numberRange" && op in NUMBER_OP_LABEL_KEYS) {
    return filterOpLabel(
      labels,
      NUMBER_OP_LABEL_KEYS[op as keyof typeof NUMBER_OP_LABEL_KEYS]
    );
  }
  if (widget === "dateRange" && op in DATE_OP_LABEL_KEYS) {
    return filterOpLabel(
      labels,
      DATE_OP_LABEL_KEYS[op as keyof typeof DATE_OP_LABEL_KEYS]
    );
  }
  if (
    widget !== undefined &&
    CHOICE_WIDGETS.has(widget) &&
    op in CHOICE_OP_LABEL_KEYS
  ) {
    return filterOpLabel(
      labels,
      CHOICE_OP_LABEL_KEYS[op as keyof typeof CHOICE_OP_LABEL_KEYS]
    );
  }
  return op;
}

/** Widgets whose value is picked from a set rather than typed. */
const CHOICE_WIDGETS: ReadonlySet<string> = new Set([
  "select",
  "multiSelect",
  "checklist",
  "boolean",
]);

/** `TableLabels` key for each operator a choice widget offers. */
const CHOICE_OP_LABEL_KEYS = {
  eq: "opEqual",
  neq: "opNotEqual",
  in: "opIn",
  notIn: "opNotIn",
} as const satisfies Record<string, keyof TableLabels>;

/**
 * A fresh condition for a def: its key and the type's default operator.
 *
 * @param def - The filter definition.
 * @param registry - The filter type registry.
 * @returns The condition, with no value yet.
 *
 * @public
 */
export function newFilterTreeCondition<TRow>(
  def: FilterDef<TRow>,
  registry: FilterTypeRegistry
): QueryCondition {
  return { key: def.key, op: filterTypeDefaultOp(def, registry) };
}

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/**
 * The value editor a condition needs, with what each edit writes.
 *
 * - `none`: a valueless operator (`empty`, `notEmpty`).
 * - `boolean`: a true / false choice.
 * - `relative`: a relative-date preset, plus a count for `last` / `next`.
 * - `between`: two bounds.
 * - `single`: one field; a list operator's field holds comma-separated text.
 *
 * @public
 */
export type FilterTreeValueEditor =
  | { readonly kind: "none" }
  | {
      readonly kind: "boolean";
      readonly choice: "true" | "false";
      readonly options: readonly FilterTreeOption[];
      readonly write: (choice: string) => unknown;
    }
  | {
      readonly kind: "relative";
      readonly preset: RelativePreset;
      readonly n: number;
      readonly counted: boolean;
      readonly options: readonly FilterTreeOption[];
      readonly writePreset: (preset: string) => unknown;
      readonly writeCount: (n: string) => unknown;
    }
  | {
      readonly kind: "between";
      readonly type: "text" | "number" | "date";
      readonly a: string;
      readonly b: string;
      readonly writeA: (a: string) => unknown;
      readonly writeB: (b: string) => unknown;
    }
  | {
      readonly kind: "single";
      readonly type: "text" | "number" | "date";
      readonly text: string;
      readonly write: (text: string) => unknown;
    };

function inputTypeFor(
  widget: string | undefined,
  op: string
): "text" | "number" | "date" {
  if (op === "relative" || isListFilterOp(op)) return "text";
  if (widget === "numberRange") return "number";
  if (widget === "dateRange") return "date";
  return "text";
}

/**
 * The value editor for one condition. Each writer returns the condition's
 * next `value`; the binding replaces the condition with it.
 *
 * @param def - The condition's filter definition.
 * @param condition - The condition.
 * @param registry - The filter type registry.
 * @param labels - Fully resolved labels.
 * @returns The editor.
 *
 * @public
 */
export function filterTreeValueEditor<TRow>(
  def: FilterDef<TRow>,
  condition: QueryCondition,
  registry: FilterTypeRegistry,
  labels: Required<TableLabels>
): FilterTreeValueEditor {
  if (isValuelessFilterOp(condition.op)) return { kind: "none" };
  const widget = filterWidgetKind(def, registry);
  if (widget === "boolean") {
    return {
      kind: "boolean",
      choice:
        condition.value === false || condition.value === "false"
          ? "false"
          : "true",
      options: [
        { value: "true", label: labels.boolTrue },
        { value: "false", label: labels.boolFalse },
      ],
      write: (choice) => choice === "true",
    };
  }
  if (condition.op === "relative") {
    const token =
      typeof condition.value === "string" ? condition.value : "today";
    const { preset, n } = splitRelativeToken(token);
    return {
      kind: "relative",
      preset,
      n,
      counted: preset === "last" || preset === "next",
      options: RELATIVE_PRESETS.map((item) => ({
        value: item,
        label: labels[RELATIVE_PRESET_LABEL_KEYS[item]],
      })),
      writePreset: (next) => joinRelativeToken(next as RelativePreset, n),
      writeCount: (next) => joinRelativeToken(preset, Number(next) || 1),
    };
  }
  const type = inputTypeFor(widget, condition.op);
  if (isBetweenFilterOp(condition.op)) {
    const pair = Array.isArray(condition.value)
      ? { a: asText(condition.value[0]), b: asText(condition.value[1]) }
      : { a: asText(condition.value), b: "" };
    return {
      kind: "between",
      type,
      ...pair,
      writeA: (a) => [a, pair.b],
      writeB: (b) => [pair.a, b],
    };
  }
  const list = isListFilterOp(condition.op);
  return {
    kind: "single",
    type,
    text: Array.isArray(condition.value)
      ? condition.value.map(asText).join(",")
      : asText(condition.value),
    write: (text) => (list ? text.split(",") : text),
  };
}

/**
 * One condition row: its def, the field and operator choices, the value
 * editor, and the condition a field change starts over with.
 *
 * @public
 */
export interface FilterTreeConditionModel<TRow> {
  /** The condition's filter definition (the first def when its key is gone). */
  readonly def: FilterDef<TRow>;
  /** Every def as a field option. */
  readonly fieldOptions: readonly FilterTreeOption[];
  /** The operators to choose from; empty when the type has only one. */
  readonly opOptions: readonly FilterTreeOption[];
  /** The value editor for the current operator. */
  readonly value: FilterTreeValueEditor;
  /** The fresh condition for a newly picked field, or `undefined` for an unknown key. */
  readonly withField: (key: string) => QueryCondition | undefined;
  /** The condition with a new operator, its value cleared. */
  readonly withOp: (op: string) => QueryCondition;
  /** The condition with a new value. */
  readonly withValue: (value: unknown) => QueryCondition;
}

/**
 * The model for one condition row.
 *
 * @param condition - The condition.
 * @param defs - Every filter definition the builder offers.
 * @param registry - The filter type registry.
 * @param labels - Fully resolved labels.
 * @returns The row's model, or `undefined` when there are no defs.
 *
 * @public
 */
export function filterTreeConditionModel<TRow>(
  condition: QueryCondition,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry,
  labels: Required<TableLabels>
): FilterTreeConditionModel<TRow> | undefined {
  const def = defs.find((item) => item.key === condition.key) ?? defs[0];
  if (!def) return undefined;
  const ops = filterTypeOps(def, registry);
  const widget = filterWidgetKind(def, registry);
  return {
    def,
    fieldOptions: defs.map((item) => ({
      value: item.key,
      label: filterLabel(item),
    })),
    opOptions:
      ops.length > 1
        ? ops.map((op) => ({
            value: op,
            label: filterTreeOpLabel(widget, op, labels),
          }))
        : [],
    value: filterTreeValueEditor(def, condition, registry, labels),
    withField(key) {
      const next = defs.find((item) => item.key === key);
      return next ? newFilterTreeCondition(next, registry) : undefined;
    },
    withOp: (op) => ({ ...condition, op, value: undefined }),
    withValue: (value) => ({ ...condition, value }),
  };
}

/**
 * The AND / OR choice for a group.
 *
 * @param labels - Fully resolved labels.
 * @returns The two options, AND first.
 *
 * @public
 */
export function filterTreeCombinatorOptions(
  labels: Required<TableLabels>
): readonly FilterTreeOption[] {
  return [
    { value: "and", label: labels.filterCombinatorAnd },
    { value: "or", label: labels.filterCombinatorOr },
  ];
}

/**
 * The edits a filter-tree builder makes, each committing the next tree.
 *
 * @public
 */
export interface FilterTreeEditorActions {
  /** Append a fresh condition (on the first def) to the group at `path`. */
  readonly addCondition: (path: readonly number[]) => void;
  /** Append an empty group to the group at `path`. */
  readonly addGroup: (path: readonly number[]) => void;
  /** Set the group at `path` to AND or OR. */
  readonly setCombinator: (path: readonly number[], next: string) => void;
  /** Replace the condition at `path`. */
  readonly replace: (path: readonly number[], next: QueryCondition) => void;
  /** Remove the node at `path`. */
  readonly remove: (path: readonly number[]) => void;
}

/**
 * The builder's edits over the current tree. The first two work without a
 * tree, starting one; the rest need the tree they edit.
 *
 * @param tree - The current tree, if any.
 * @param commit - Writes the next tree.
 * @param first - The def a new condition starts on.
 * @param registry - The filter type registry.
 * @returns The edits.
 *
 * @public
 */
export function filterTreeEditorActions<TRow>(
  tree: QueryFilterGroup | undefined,
  commit: (tree: QueryFilterGroup | undefined) => void,
  first: FilterDef<TRow>,
  registry: FilterTypeRegistry
): FilterTreeEditorActions {
  const current = tree ?? emptyFilterTree();
  return {
    addCondition: (path) =>
      commit(
        addFilterTreeCondition(
          tree,
          path,
          newFilterTreeCondition(first, registry)
        )
      ),
    addGroup: (path) => commit(addFilterTreeGroup(current, path)),
    setCombinator: (path, next) =>
      commit(
        setFilterTreeCombinator(current, path, next === "or" ? "or" : "and")
      ),
    replace: (path, next) => commit(replaceFilterTreeNode(current, path, next)),
    remove: (path) => commit(removeFilterTreeNode(current, path)),
  };
}

function conditionValueText(
  condition: QueryCondition,
  labels: Required<TableLabels>
): string | undefined {
  const value = condition.value;
  if (condition.op === "relative" && typeof value === "string") {
    return relativeTokenLabel(value, labels);
  }
  if (Array.isArray(value)) {
    const parts = value.map(asText).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  if (value === "") return undefined;
  return asText(value) || undefined;
}

/**
 * The chip label for one filter-tree condition. The operator reads through
 * the def's registry widget — the same one the builder offers it with — so
 * a custom type's operators read as words in its chips too.
 *
 * @param condition - The condition.
 * @param defs - The filter definitions.
 * @param labels - Fully resolved labels.
 * @param registry - The filter type registry. Omit for the built-in types.
 * @returns The label.
 *
 * @public
 */
export function filterTreeChipLabel<TRow>(
  condition: QueryCondition,
  defs: readonly FilterDef<TRow>[],
  labels: Required<TableLabels>,
  registry?: FilterTypeRegistry
): string {
  const def = defs.find((item) => item.key === condition.key);
  const field = def ? filterLabel(def) : condition.key;
  let widget: string | undefined = def?.type;
  if (def && registry) widget = filterWidgetKind(def, registry);
  return formatFilterChip(
    field,
    filterTreeOpLabel(widget, condition.op, labels),
    conditionValueText(condition, labels)
  );
}
