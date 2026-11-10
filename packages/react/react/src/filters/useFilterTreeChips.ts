/**
 * Removable chips for every leaf in the AND/OR filter tree.
 */
import {
  type FilterDef,
  filterTreeConditionChips,
  type FilterTypeRegistry,
  type QueryFilterGroup,
  removeFilterTreeNode,
  type TableLabels,
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
  return useMemo(
    () =>
      filterTreeConditionChips({
        tree,
        defs,
        labels,
        registry,
        onRemove:
          tree && setFilterTree
            ? (path) => {
                setFilterTree(removeFilterTreeNode(tree, path));
              }
            : undefined,
      }),
    [defs, labels, setFilterTree, tree, registry]
  );
}
