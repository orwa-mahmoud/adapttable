/**
 * AND/OR filter tree — the engine behind advanced filters (#278).
 * The URL and Saved Views store a versioned encoding; the frontend
 * predicate and the server query both read the same `QueryFilterGroup`.
 * The builder UI is #279; this file is the evaluator.
 */
import type { ExtraFilters } from "../contracts/columns";
import type { QueryCondition, QueryFilterGroup } from "../contracts/query";
import { isFilterGroup } from "../source/queryContract";
import { type FilterDef, filterPredicate } from "./filterDefs";
import type { FilterTypeRegistry } from "./filterRegistry";
import { settledFilterTree } from "./filterTreeCodec";
import { filterOpKey } from "./operators";

export {
  FILTER_TREE_PARAM,
  FILTER_TREE_VERSION,
  isActiveFilterTree,
  isFilterTreeConditionSet,
  parseFilterTree,
  serializeFilterTree,
  settledFilterTree,
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
 * @public
 */
export function conditionToExtra<TRow>(
  def: FilterDef<TRow>,
  condition: QueryCondition,
  registry: FilterTypeRegistry
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
 * Conditions still waiting for a value — and groups holding only those — are
 * left out, as if they were not there.
 *
 * @public
 */
export function evaluateFilterTree<TRow>(
  tree: QueryFilterGroup | undefined,
  row: TRow,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry
): boolean {
  const settled = settledFilterTree(tree);
  if (!settled) return true;
  const results = settled.conditions.map((node) =>
    isFilterGroup(node)
      ? evaluateFilterTree(node, row, defs, registry)
      : matchCondition(row, node, defs, registry)
  );
  return settled.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}

/** One condition, its definition, predicate and filter values resolved. */
function prepareCondition<TRow>(
  condition: QueryCondition,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry
): (row: TRow) => boolean {
  const def = defs.find((item) => item.key === condition.key);
  if (!def) return () => true;
  const predicate = filterPredicate(def, registry);
  const extra = conditionToExtra(def, condition, registry);
  return (row) => predicate(row, extra);
}

/**
 * A tree prepared once for many rows: settled, and each condition's
 * definition, predicate and filter values resolved, so a row only runs the
 * predicates. Answers as {@link evaluateFilterTree} does.
 */
export function prepareFilterTree<TRow>(
  tree: QueryFilterGroup | undefined,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry
): (row: TRow) => boolean {
  const settled = settledFilterTree(tree);
  if (!settled) return () => true;
  const parts = settled.conditions.map((node) =>
    isFilterGroup(node)
      ? prepareFilterTree(node, defs, registry)
      : prepareCondition(node, defs, registry)
  );
  return settled.combinator === "and"
    ? (row) => parts.every((part) => part(row))
    : (row) => parts.some((part) => part(row));
}

interface PreparedTree<TRow> {
  readonly defs: readonly FilterDef<TRow>[];
  readonly registry: FilterTypeRegistry;
  readonly run: (row: TRow) => boolean;
}

/** Each tree an engine has read, prepared for the definitions it read with. */
const preparedTrees = /* @__PURE__ */ new WeakMap<
  QueryFilterGroup,
  PreparedTree<never>
>();

/**
 * {@link evaluateFilterTree} for an engine, which reads every row of a pass
 * against the same tree: the tree is prepared once per tree, definitions and
 * registry, then each row runs only its predicates.
 */
export function evaluatePreparedFilterTree<TRow>(
  tree: QueryFilterGroup,
  row: TRow,
  defs: readonly FilterDef<TRow>[],
  registry: FilterTypeRegistry
): boolean {
  let prepared = preparedTrees.get(tree) as PreparedTree<TRow> | undefined;
  if (prepared?.defs !== defs || prepared.registry !== registry) {
    prepared = { defs, registry, run: prepareFilterTree(tree, defs, registry) };
    preparedTrees.set(tree, prepared);
  }
  return prepared.run(row);
}
