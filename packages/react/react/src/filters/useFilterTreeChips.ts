/**
 * Removable chips for every leaf in the AND/OR filter tree.
 */
import {
  type FilterDef,
  filterTreeChipLabel,
  type FilterTypeRegistry,
  isFilterTreeConditionSet,
  type QueryFilterGroup,
  removeFilterTreeNode,
  type TableLabels,
  walkFilterTreeConditions,
} from "@adapttable/core";
import { useMemo } from "react";

import type { ActiveFilterChip } from "./useActiveFilterChips";

export { filterTreeChipLabel } from "@adapttable/core";

/**
 * Options for {@link useFilterTreeChips}.
 *
 * @public
 */
export interface UseFilterTreeChipsOptions<TRow> {
  /** The filter tree being edited. */
  readonly tree: QueryFilterGroup | undefined;
  /** Filter definitions available. */
  readonly defs: readonly FilterDef<TRow>[];
  /** Resolved labels, every key filled. */
  readonly labels: Required<TableLabels>;
  /** Replaces the filter tree. */
  readonly setFilterTree?: (tree: QueryFilterGroup | undefined) => void;
  /**
   * The filter type registry the builder reads operators through. Omit and
   * operators are labeled by each def's `type`.
   */
  readonly registry?: FilterTypeRegistry;
}

/**
 * Flatten the tree into removable chips.
 *
 * @public
 */
export function useFilterTreeChips<TRow>(
  options: UseFilterTreeChipsOptions<TRow>
): readonly ActiveFilterChip[] {
  const { tree, defs, labels, setFilterTree, registry } = options;
  return useMemo(() => {
    if (!tree || !setFilterTree) return [];
    // A condition still waiting for a value filters nothing, so it is no chip.
    return walkFilterTreeConditions(tree)
      .filter(({ condition }) => isFilterTreeConditionSet(condition))
      .map(({ condition, path }) => ({
        key: `ft:${path.join(".")}:${condition.key}:${condition.op}`,
        label: filterTreeChipLabel(condition, defs, labels, registry),
        onRemove: () => setFilterTree(removeFilterTreeNode(tree, path)),
      }));
  }, [defs, labels, setFilterTree, tree, registry]);
}
