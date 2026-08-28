/**
 * Immutable updates for an AND/OR filter tree. Paths are child indexes
 * from the root (`[]` is the root group).
 */
import type { QueryCondition, QueryFilterGroup } from "../source/queryContract";
import { isFilterGroup } from "../source/queryContract";

/** One node in a filter tree: a single condition, or a group of them. */
export type FilterTreeNode = QueryCondition | QueryFilterGroup;

/**
 * An empty AND group — the tree a first "Add condition" starts from.
 *
 * @public
 */
export function emptyFilterTree(): QueryFilterGroup {
  return { combinator: "and", conditions: [] };
}

function cloneGroup(group: QueryFilterGroup): QueryFilterGroup {
  return { combinator: group.combinator, conditions: [...group.conditions] };
}

function atGroup(
  tree: QueryFilterGroup,
  path: readonly number[]
): QueryFilterGroup | undefined {
  let current = tree;
  for (const index of path) {
    const child = current.conditions[index];
    if (!child || !isFilterGroup(child)) return undefined;
    current = child;
  }
  return current;
}

function replaceChild(
  tree: QueryFilterGroup,
  path: readonly number[],
  index: number,
  next: FilterTreeNode | undefined
): QueryFilterGroup {
  if (path.length === 0) {
    const group = cloneGroup(tree);
    const conditions = [...group.conditions];
    if (next === undefined) conditions.splice(index, 1);
    else conditions[index] = next;
    return { ...group, conditions };
  }
  const [head, ...rest] = path;
  const child = tree.conditions[head!];
  if (!child || !isFilterGroup(child)) return tree;
  const updated = replaceChild(child, rest, index, next);
  return replaceChild(tree, [], head!, updated);
}

/**
 * Set the combinator on the group at `path`.
 *
 * @public
 */
export function setFilterTreeCombinator(
  tree: QueryFilterGroup,
  path: readonly number[],
  combinator: QueryFilterGroup["combinator"]
): QueryFilterGroup {
  const group = atGroup(tree, path);
  if (!group) return tree;
  if (path.length === 0) return { ...tree, combinator };
  const parentPath = path.slice(0, -1);
  const index = path.at(-1)!;
  return replaceChild(tree, parentPath, index, { ...group, combinator });
}

/** Append a child to the group at `path`. */
export function appendFilterTreeChild(
  tree: QueryFilterGroup | undefined,
  path: readonly number[],
  child: FilterTreeNode
): QueryFilterGroup {
  const root = tree ?? emptyFilterTree();
  const group = atGroup(root, path);
  if (!group) return root;
  const next: QueryFilterGroup = {
    ...group,
    conditions: [...group.conditions, child],
  };
  if (path.length === 0) return next;
  const parentPath = path.slice(0, -1);
  const index = path.at(-1)!;
  return replaceChild(root, parentPath, index, next);
}

/**
 * Append a condition to the group at `path`.
 *
 * @public
 */
export function addFilterTreeCondition(
  tree: QueryFilterGroup | undefined,
  path: readonly number[],
  condition: QueryCondition
): QueryFilterGroup {
  return appendFilterTreeChild(tree, path, condition);
}

/**
 * Append a nested AND group to the group at `path`.
 *
 * @public
 */
export function addFilterTreeGroup(
  tree: QueryFilterGroup | undefined,
  path: readonly number[]
): QueryFilterGroup {
  return appendFilterTreeChild(tree, path, emptyFilterTree());
}

/**
 * Replace the node at `path` (path must name a child, not the root).
 *
 * @public
 */
export function replaceFilterTreeNode(
  tree: QueryFilterGroup,
  path: readonly number[],
  next: FilterTreeNode
): QueryFilterGroup {
  if (path.length === 0) {
    return isFilterGroup(next) ? next : tree;
  }
  const parentPath = path.slice(0, -1);
  const index = path.at(-1)!;
  return replaceChild(tree, parentPath, index, next);
}

/**
 * Remove the node at `path`. Removing the last root child returns
 * `undefined` so the URL drops `ft`.
 *
 * @public
 */
export function removeFilterTreeNode(
  tree: QueryFilterGroup,
  path: readonly number[]
): QueryFilterGroup | undefined {
  if (path.length === 0) return undefined;
  const parentPath = path.slice(0, -1);
  const index = path.at(-1)!;
  const next = replaceChild(tree, parentPath, index, undefined);
  if (next.conditions.length === 0) return undefined;
  return next;
}

/**
 * Walk every leaf, with the path to that leaf.
 *
 * @public
 */
export function walkFilterTreeConditions(
  tree: QueryFilterGroup | undefined,
  path: readonly number[] = []
): { condition: QueryCondition; path: readonly number[] }[] {
  if (!tree) return [];
  const out: { condition: QueryCondition; path: readonly number[] }[] = [];
  tree.conditions.forEach((node, index) => {
    const childPath = [...path, index];
    if (isFilterGroup(node)) {
      out.push(...walkFilterTreeConditions(node, childPath));
      return;
    }
    out.push({ condition: node, path: childPath });
  });
  return out;
}
