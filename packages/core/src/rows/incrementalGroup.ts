/**
 * Incremental grouping — keep the partition tree {@link buildGroupedFlatModel}
 * walks, and only re-bucket the rows a patch touched.
 *
 * Flattening still goes through {@link flattenGroupPartitions} so collapse,
 * paging, group sort and group filter stay one implementation.
 */
import {
  groupingKeys,
  type GroupPartition,
  groupValueKey,
  resolveGroupValue,
} from "../grouping/groupRows";
import type { ColumnDef } from "../types";

/** One mutable bucket; `childMap` is the same nodes as `children`. */
export interface MutablePartition<TRow> {
  /** The value itself. */
  value: unknown;
  /** Stable key for the partition's value. */
  valueKey: string;
  /** Rows in this partition. */
  rows: TRow[];
  /** Nested partitions under this one. */
  children?: MutablePartition<TRow>[];
  /** Those children, by value key. */
  childMap: Map<string, MutablePartition<TRow>>;
}

/** The grouping keys and the live tree incremental updates mutate. */
export interface IncrementalGroupTree<TRow> {
  /** Columns the tree groups on, outermost first. */
  keys: readonly string[];
  /** Visible columns, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** Top-level partitions. */
  roots: MutablePartition<TRow>[];
  /** Those roots, by value key. */
  rootMap: Map<string, MutablePartition<TRow>>;
}

/**
 * The value-key path a row takes through the grouping keys.
 *
 * @typeParam TRow - The row type.
 * @param row - The row to place.
 * @param keys - Grouping keys, outermost first.
 * @param columns - Columns, for each key's `sortValue`.
 */
export function rowGroupPath<TRow>(
  row: TRow,
  keys: readonly string[],
  columns: readonly ColumnDef<TRow>[]
): { value: unknown; valueKey: string }[] {
  return keys.map((key) => {
    const column = columns.find((item) => item.key === key);
    const value = resolveGroupValue(row, key, column);
    return { value, valueKey: groupValueKey(value) };
  });
}

/**
 * Build a live tree from a frozen partition list (the full-eval path).
 *
 * @typeParam TRow - The row type.
 * @param partitions - The buckets {@link partitionGroupedRows} produced.
 * @param groupBy - The grouping keys those buckets used.
 * @param columns - Columns, kept so later patches resolve the same way.
 */
export function incrementalGroupTree<TRow>(
  partitions: readonly GroupPartition<TRow>[],
  groupBy: string | readonly string[],
  columns: readonly ColumnDef<TRow>[]
): IncrementalGroupTree<TRow> {
  const roots = partitions.map(toMutable);
  return {
    keys: groupingKeys(groupBy),
    columns,
    roots,
    rootMap: mapOf(roots),
  };
}

/**
 * A readonly view of the live tree for {@link flattenGroupPartitions}.
 *
 * @typeParam TRow - The row type.
 * @param tree - The live tree.
 */
export function snapshotPartitions<TRow>(
  tree: IncrementalGroupTree<TRow>
): GroupPartition<TRow>[] {
  return tree.roots.map(toFrozen);
}

/**
 * Insert a row along its group path, creating buckets that do not exist
 * yet. Sibling order is first-seen: a new group lands where its first
 * leaf sits in the sorted list.
 *
 * @typeParam TRow - The row type.
 * @param tree - The live tree.
 * @param row - The row that entered the sorted set.
 * @param path - {@link rowGroupPath} of `row`.
 * @param sortedIndex - Current index of each id in the sorted list.
 * @param getRowId - How a row's id is derived.
 */
export function addGroupedRow<TRow>(
  tree: IncrementalGroupTree<TRow>,
  row: TRow,
  path: readonly { value: unknown; valueKey: string }[],
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  let siblings = tree.roots;
  let siblingMap = tree.rootMap;
  for (const step of path) {
    let node = siblingMap.get(step.valueKey);
    if (!node) {
      node = {
        value: step.value,
        valueKey: step.valueKey,
        rows: [],
        children: [],
        childMap: new Map(),
      };
      const at = firstSeenInsertAt(siblings, row, sortedIndex, getRowId);
      siblings.splice(at, 0, node);
      siblingMap.set(step.valueKey, node);
    }
    insertLeaf(node.rows, row, sortedIndex, getRowId);
    siblings = node.children ?? (node.children = []);
    siblingMap = node.childMap;
  }
  rebalance(tree, path, sortedIndex, getRowId);
}

/**
 * Remove a row along a path it used to sit on. Empty buckets drop, so a
 * group that just lost its last leaf disappears the way a full rebuild
 * would drop it.
 *
 * @typeParam TRow - The row type.
 * @param tree - The live tree.
 * @param id - The row id to drop.
 * @param path - The path the row was on.
 * @param sortedIndex - Current sorted indices, so remaining groups keep
 *   first-seen order.
 * @param getRowId - How a row's id is derived.
 */
export function removeGroupedRow<TRow>(
  tree: IncrementalGroupTree<TRow>,
  id: string,
  path: readonly { valueKey: string }[],
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  const chain: {
    node: MutablePartition<TRow>;
    siblings: MutablePartition<TRow>[];
    siblingMap: Map<string, MutablePartition<TRow>>;
  }[] = [];
  let siblings = tree.roots;
  let siblingMap = tree.rootMap;
  for (const step of path) {
    const node = siblingMap.get(step.valueKey);
    if (!node) return;
    chain.push({ node, siblings, siblingMap });
    siblings = node.children ?? [];
    siblingMap = node.childMap;
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    const { node, siblings: list, siblingMap: map } = chain[i]!;
    removeLeaf(node.rows, id, getRowId);
    if (node.rows.length > 0) continue;
    const at = list.indexOf(node);
    if (at !== -1) list.splice(at, 1);
    map.delete(node.valueKey);
  }
  rebalance(tree, path, sortedIndex, getRowId);
}

/**
 * Move a row from one path to another, or reposition it inside the same
 * path when only its sort index changed.
 *
 * @typeParam TRow - The row type.
 * @param tree - The live tree.
 * @param prev - The row that left.
 * @param next - The row that entered.
 * @param prevPath - Path of `prev`.
 * @param nextPath - Path of `next`.
 * @param sortedIndex - Current sorted indices.
 * @param getRowId - How a row's id is derived.
 */
export function moveGroupedRow<TRow>(
  tree: IncrementalGroupTree<TRow>,
  prev: TRow,
  next: TRow,
  prevPath: readonly { value: unknown; valueKey: string }[],
  nextPath: readonly { value: unknown; valueKey: string }[],
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  const samePath =
    prevPath.length === nextPath.length &&
    prevPath.every((step, i) => step.valueKey === nextPath[i]?.valueKey);
  if (samePath) {
    replaceAlongPath(tree, next, nextPath, sortedIndex, getRowId);
    return;
  }
  removeGroupedRow(tree, getRowId(prev), prevPath, sortedIndex, getRowId);
  addGroupedRow(tree, next, nextPath, sortedIndex, getRowId);
}

function replaceAlongPath<TRow>(
  tree: IncrementalGroupTree<TRow>,
  row: TRow,
  path: readonly { valueKey: string }[],
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  let siblingMap = tree.rootMap;
  const id = getRowId(row);
  for (const step of path) {
    const node = siblingMap.get(step.valueKey);
    if (!node) return;
    removeLeaf(node.rows, id, getRowId);
    insertLeaf(node.rows, row, sortedIndex, getRowId);
    siblingMap = node.childMap;
  }
  rebalance(tree, path, sortedIndex, getRowId);
}

function rebalance<TRow>(
  tree: IncrementalGroupTree<TRow>,
  path: readonly { valueKey: string }[],
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  sortSiblings(tree.roots, sortedIndex, getRowId);
  let map = tree.rootMap;
  for (const step of path) {
    const node = map.get(step.valueKey);
    if (!node?.children) break;
    sortSiblings(node.children, sortedIndex, getRowId);
    map = node.childMap;
  }
}

function sortSiblings<TRow>(
  siblings: MutablePartition<TRow>[],
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  siblings.sort((a, b) => {
    return (
      firstLeafIndex(a, sortedIndex, getRowId) -
      firstLeafIndex(b, sortedIndex, getRowId)
    );
  });
}

function firstLeafIndex<TRow>(
  node: MutablePartition<TRow>,
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): number {
  const first = node.rows[0];
  if (!first) return Number.POSITIVE_INFINITY;
  return sortedIndex.get(getRowId(first)) ?? Number.POSITIVE_INFINITY;
}

function firstSeenInsertAt<TRow>(
  siblings: readonly MutablePartition<TRow>[],
  row: TRow,
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): number {
  const incoming = sortedIndex.get(getRowId(row)) ?? Number.POSITIVE_INFINITY;
  const at = siblings.findIndex((sibling) => {
    const first = sibling.rows[0];
    if (!first) return true;
    return (
      (sortedIndex.get(getRowId(first)) ?? Number.POSITIVE_INFINITY) > incoming
    );
  });
  return at === -1 ? siblings.length : at;
}

function insertLeaf<TRow>(
  rows: TRow[],
  row: TRow,
  sortedIndex: ReadonlyMap<string, number>,
  getRowId: (row: TRow) => string
): void {
  const incoming = sortedIndex.get(getRowId(row)) ?? Number.POSITIVE_INFINITY;
  const at = rows.findIndex((existing) => {
    return (
      (sortedIndex.get(getRowId(existing)) ?? Number.POSITIVE_INFINITY) >
      incoming
    );
  });
  rows.splice(at === -1 ? rows.length : at, 0, row);
}

function removeLeaf<TRow>(
  rows: TRow[],
  id: string,
  getRowId: (row: TRow) => string
): void {
  const at = rows.findIndex((row) => getRowId(row) === id);
  if (at !== -1) rows.splice(at, 1);
}

function toMutable<TRow>(part: GroupPartition<TRow>): MutablePartition<TRow> {
  const children = part.children?.map(toMutable);
  return {
    value: part.value,
    valueKey: part.valueKey,
    rows: [...part.rows],
    children,
    childMap: mapOf(children ?? []),
  };
}

function toFrozen<TRow>(part: MutablePartition<TRow>): GroupPartition<TRow> {
  return {
    value: part.value,
    valueKey: part.valueKey,
    rows: part.rows,
    children: part.children?.map(toFrozen),
  };
}

function mapOf<TRow>(
  nodes: readonly MutablePartition<TRow>[]
): Map<string, MutablePartition<TRow>> {
  return new Map(nodes.map((node) => [node.valueKey, node]));
}
