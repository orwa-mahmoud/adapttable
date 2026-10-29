/**
 * Removable chips for every leaf in the AND/OR filter tree.
 */
import {
  type ActiveFilterChip,
  type FilterDef,
  filterTreeChipLabel,
  type FilterTypeRegistry,
  isFilterTreeConditionSet,
  type QueryFilterGroup,
  removeFilterTreeNode,
  type TableLabels,
  walkFilterTreeConditions,
} from "@adapttable/core";

/**
 * One chip per condition in the tree, each removing its own node.
 *
 * @param tree - The filter tree, when the table has one.
 * @param setTree - Replaces the tree. Absent, there are no chips.
 * @param defs - The definitions the labels are read from.
 * @param labels - Resolved labels.
 * @param registry - Custom types, when the host registered any.
 * @returns The chips, empty when the tree is absent.
 *
 * @public
 */
export function filterTreeChips<TRow>(
  tree: QueryFilterGroup | undefined,
  setTree: ((tree: QueryFilterGroup | undefined) => void) | undefined,
  defs: readonly FilterDef<TRow>[],
  labels: Required<TableLabels>,
  registry: FilterTypeRegistry | undefined
): readonly ActiveFilterChip[] {
  if (!tree || !setTree) return [];
  // A condition still waiting for a value filters nothing, so it is no chip.
  return walkFilterTreeConditions(tree)
    .filter(({ condition }) => isFilterTreeConditionSet(condition))
    .map(({ condition, path }) => ({
      key: `ft:${path.join(".")}:${condition.key}:${condition.op}`,
      label: filterTreeChipLabel(condition, defs, labels, registry),
      onRemove: () => {
        setTree(removeFilterTreeNode(tree, path));
      },
    }));
}
