/**
 * The removable chips the AND/OR filter tree contributes to the active-filter
 * strip, one per condition that filters.
 */
import type { QueryFilterGroup } from "../contracts/query";
import type { TableLabels } from "../types";
import type { ActiveFilterChip } from "./activeFilterChips";
import type { FilterDef } from "./filterDefs";
import type { FilterTypeRegistry } from "./filterRegistry";
import { isFilterTreeConditionSet } from "./filterTreeCodec";
import { filterTreeChipLabel } from "./filterTreeEditor";
import { walkFilterTreeConditions } from "./filterTreeMutations";

/**
 * One removable chip per set condition in the AND/OR filter tree, in the
 * tree's order. A condition still waiting for a value filters nothing, so it
 * is no chip.
 *
 * @param input - The tree, its field definitions, the table's labels, the
 *   filter type registry, and what removing a chip does with the condition's
 *   path.
 * @returns The chips; none without a tree or a way to remove from it.
 *
 * @public
 */
export function filterTreeConditionChips<TRow>(input: {
  readonly tree: QueryFilterGroup | undefined;
  readonly defs: readonly FilterDef<TRow>[];
  readonly labels: Required<TableLabels>;
  readonly registry?: FilterTypeRegistry;
  readonly onRemove: ((path: readonly number[]) => void) | undefined;
}): readonly ActiveFilterChip[] {
  const { tree, defs, labels, registry, onRemove } = input;
  if (!tree || !onRemove) return [];
  return walkFilterTreeConditions(tree)
    .filter(({ condition }) => isFilterTreeConditionSet(condition))
    .map(({ condition, path }) => ({
      key: `ft:${path.join(".")}:${condition.key}:${condition.op}`,
      label: filterTreeChipLabel(condition, defs, labels, registry),
      onRemove: () => {
        onRemove(path);
      },
    }));
}
