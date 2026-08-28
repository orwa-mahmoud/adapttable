/**
 * AND/OR filter tree — the engine behind advanced filters (#278).
 * The URL and Saved Views store a versioned encoding; the frontend
 * predicate and the server query both read the same `QueryFilterGroup`.
 * The builder UI is #279; this file is the evaluator.
 */
import type { QueryCondition, QueryFilterGroup } from "../source/queryContract";
import { isFilterGroup } from "../source/queryContract";
import type { ExtraFilters } from "../types";
import { defaultFilterRegistry } from "./filterBuiltins";
import { type FilterDef, filterPredicate } from "./filterDefs";
import type { FilterTypeRegistry } from "./filterRegistry";
import { isActiveFilterTree } from "./filterTreeCodec";
import { filterOpKey } from "./operators";

export {
  FILTER_TREE_PARAM,
  FILTER_TREE_VERSION,
  isActiveFilterTree,
  parseFilterTree,
  serializeFilterTree,
} from "./filterTreeCodec";

function asScalar(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

/**
 * Project one tree condition onto the extra-filter bag the existing
 * per-def predicate already understands.
 *
 * @internal
 */
export function conditionToExtra<TRow>(
  def: FilterDef<TRow>,
  condition: QueryCondition,
  registry: FilterTypeRegistry = defaultFilterRegistry
): ExtraFilters {
  const spec = registry.get(def.type);
  if (spec) return spec.conditionToExtra(def, condition);
  return {
    [def.key]: asScalar(condition.value),
    [filterOpKey(def.key)]: condition.op,
  };
}

function matchCondition<TRow>(
  row: TRow,
  condition: QueryCondition,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry
): boolean {
  const def = defs.find((item) => item.key === condition.key);
  if (!def) return true;
  return filterPredicate(def, registry)(
    row,
    conditionToExtra(def, condition, registry)
  );
}

/**
 * Evaluate a tree against one row. An empty / missing tree matches
 * every row. Unknown condition keys match (stale links do not hide data).
 *
 * @internal
 */
export function evaluateFilterTree<TRow>(
  tree: QueryFilterGroup | undefined,
  row: TRow,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry = defaultFilterRegistry
): boolean {
  if (!isActiveFilterTree(tree)) return true;
  const results = tree.conditions.map((node) =>
    isFilterGroup(node)
      ? evaluateFilterTree(node, row, defs, registry)
      : matchCondition(row, node, defs, registry)
  );
  return tree.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}
