/**
 * Versioned AND/OR filter-tree encoding (`ft=1.{…}`).
 * Kept free of predicates so the URL layer does not pull the filter engine
 * into a table that never declares filters.
 */
import {
  isFilterGroup,
  type QueryCondition,
  type QueryFilterGroup,
} from "../source/queryContract";
import { isValuelessFilterOp } from "./operators";

/**
 * URL param for the versioned tree (`ft=1.{…}`).
 *
 * @public
 */
export const FILTER_TREE_PARAM = "ft";

/**
 * Current encoding version. Unknown versions are dropped, never reinterpreted.
 *
 * @public
 */
export const FILTER_TREE_VERSION = 1;

const VERSION_PREFIX = `${FILTER_TREE_VERSION}.`;

/**
 * True when a tree has at least one condition (nested groups count).
 *
 * @public
 */
export function isActiveFilterTree(
  tree: QueryFilterGroup | undefined
): tree is QueryFilterGroup {
  return tree != null && tree.conditions.length > 0;
}

/**
 * Whether a filter-tree condition narrows rows yet. A valueless operator
 * ("is empty") always does; any other operator needs a value. A condition
 * still being filled in is ignored — it gets no chip, is not counted, is not
 * sent to a server, and cannot widen an OR group to every row.
 *
 * @param condition - The condition.
 * @returns Whether it filters.
 *
 * @public
 */
export function isFilterTreeConditionSet(condition: QueryCondition): boolean {
  if (isValuelessFilterOp(condition.op)) return true;
  const values = Array.isArray(condition.value)
    ? condition.value
    : [condition.value];
  // Anything else — a number, a boolean, a custom type's own value object —
  // is a value the condition was given.
  return values.some((value) => value != null && value !== "");
}

/**
 * The tree with every condition still waiting for a value — and every group
 * left with none — removed, or `undefined` when nothing is left. It is the
 * tree the table evaluates and a server receives; an unchanged tree comes
 * back as the same object.
 *
 * @param tree - The tree as edited.
 * @returns The tree that filters.
 *
 * @public
 */
export function settledFilterTree(
  tree: QueryFilterGroup | undefined
): QueryFilterGroup | undefined {
  if (!tree) return undefined;
  let changed = false;
  const conditions: (QueryCondition | QueryFilterGroup)[] = [];
  for (const node of tree.conditions) {
    const kept = settledNode(node);
    if (kept !== node) changed = true;
    if (kept) conditions.push(kept);
  }
  if (conditions.length === 0) return undefined;
  return changed ? { ...tree, conditions } : tree;
}

function settledNode(
  node: QueryCondition | QueryFilterGroup
): QueryCondition | QueryFilterGroup | undefined {
  if (isFilterGroup(node)) return settledFilterTree(node);
  return isFilterTreeConditionSet(node) ? node : undefined;
}

function isCombinator(raw: unknown): raw is QueryFilterGroup["combinator"] {
  return raw === "and" || raw === "or";
}

function sanitizeCondition(raw: unknown): QueryCondition | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const node = raw as Record<string, unknown>;
  if (typeof node.key !== "string" || node.key === "") return undefined;
  if (typeof node.op !== "string" || node.op === "") return undefined;
  return { key: node.key, op: node.op, value: node.value };
}

function sanitizeGroup(raw: unknown): QueryFilterGroup | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const node = raw as Record<string, unknown>;
  if (!isCombinator(node.combinator)) return undefined;
  if (!Array.isArray(node.conditions)) return undefined;
  const conditions: (QueryCondition | QueryFilterGroup)[] = [];
  for (const child of node.conditions) {
    const group = sanitizeGroup(child);
    if (group) {
      conditions.push(group);
      continue;
    }
    const condition = sanitizeCondition(child);
    if (condition) conditions.push(condition);
  }
  return { combinator: node.combinator, conditions };
}

/**
 * Parse a stored `ft` value. Missing, malformed, or unknown-version
 * strings return `undefined` so an old or hand-edited link never
 * silently becomes a different query.
 *
 * @public
 */
export function parseFilterTree(
  raw: string | null | undefined
): QueryFilterGroup | undefined {
  if (raw == null || raw === "") return undefined;
  if (!raw.startsWith(VERSION_PREFIX)) return undefined;
  try {
    return sanitizeGroup(JSON.parse(raw.slice(VERSION_PREFIX.length)));
  } catch {
    return undefined;
  }
}

/**
 * Encode a tree for the URL. Empty / undefined trees omit the param.
 *
 * @public
 */
export function serializeFilterTree(
  tree: QueryFilterGroup | undefined
): string | undefined {
  if (!isActiveFilterTree(tree)) return undefined;
  return `${VERSION_PREFIX}${JSON.stringify(tree)}`;
}
