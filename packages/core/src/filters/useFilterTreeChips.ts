/**
 * Removable chips for every leaf in the AND/OR filter tree.
 */
import { useMemo } from "react";

import type { QueryCondition, QueryFilterGroup } from "../source/queryContract";
import type { TableLabels } from "../types";
import { type FilterDef, filterLabel } from "./filterDefs";
import { filterOpLabel } from "./filterForm";
import {
  removeFilterTreeNode,
  walkFilterTreeConditions,
} from "./filterTreeMutations";
import {
  DATE_OP_LABEL_KEYS,
  type DateOp,
  formatFilterChip,
  NUMBER_OP_LABEL_KEYS,
  type NumberOp,
  TEXT_OP_LABEL_KEYS,
  type TextOp,
} from "./operators";
import { relativeTokenLabel } from "./relativeDates";
import type { ActiveFilterChip } from "./useActiveFilterChips";

function conditionValueText(
  condition: QueryCondition,
  labels: Required<TableLabels>
): string | undefined {
  const value = condition.value;
  if (condition.op === "relative" && typeof value === "string") {
    return relativeTokenLabel(value, labels);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
          ? String(item)
          : ""
      )
      .filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function conditionOpWord<TRow>(
  def: FilterDef<TRow> | undefined,
  op: string,
  labels: Required<TableLabels>
): string {
  if (def?.type === "text" && op in TEXT_OP_LABEL_KEYS) {
    return filterOpLabel(labels, TEXT_OP_LABEL_KEYS[op as TextOp]);
  }
  if (def?.type === "numberRange" && op in NUMBER_OP_LABEL_KEYS) {
    return filterOpLabel(labels, NUMBER_OP_LABEL_KEYS[op as NumberOp]);
  }
  if (def?.type === "dateRange" && op in DATE_OP_LABEL_KEYS) {
    return filterOpLabel(labels, DATE_OP_LABEL_KEYS[op as DateOp]);
  }
  return op;
}

/**
 * Build one chip label for a tree leaf.
 *
 * @public
 */
export function filterTreeChipLabel<TRow>(
  condition: QueryCondition,
  defs: readonly FilterDef<TRow>[],
  labels: Required<TableLabels>
): string {
  const def = defs.find((item) => item.key === condition.key);
  const field = def ? filterLabel(def) : condition.key;
  return formatFilterChip(
    field,
    conditionOpWord(def, condition.op, labels),
    conditionValueText(condition, labels)
  );
}

/**
 * Options for {@link useFilterTreeChips}.
 *
 * @public
 */
export interface UseFilterTreeChipsOptions<TRow> {
  readonly tree: QueryFilterGroup | undefined;
  readonly defs: readonly FilterDef<TRow>[];
  readonly labels: Required<TableLabels>;
  readonly setFilterTree?: (tree: QueryFilterGroup | undefined) => void;
}

/**
 * Flatten the tree into removable chips.
 *
 * @public
 */
export function useFilterTreeChips<TRow>(
  options: UseFilterTreeChipsOptions<TRow>
): readonly ActiveFilterChip[] {
  const { tree, defs, labels, setFilterTree } = options;
  return useMemo(() => {
    if (!tree || !setFilterTree) return [];
    return walkFilterTreeConditions(tree).map(({ condition, path }) => ({
      key: `ft:${path.join(".")}:${condition.key}:${condition.op}`,
      label: filterTreeChipLabel(condition, defs, labels),
      onRemove: () => setFilterTree(removeFilterTreeNode(tree, path)),
    }));
  }, [defs, labels, setFilterTree, tree]);
}
