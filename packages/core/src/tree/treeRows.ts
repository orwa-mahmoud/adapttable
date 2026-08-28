/**
 * Hierarchical rows — a tree the DATA declares, not one derived from values.
 *
 * This is deliberately not the grouping model. A group is an answer to a
 * question the reader asked ("by team"), computed from values and re-computed
 * when they change the question. A tree is a fact about the rows: a folder
 * contains files, a task has subtasks, an account rolls up to a parent. Sharing
 * one implementation would mean either grouping that cannot express a real
 * hierarchy, or a tree that reshuffles when someone sorts a column.
 *
 * A host declares the shape either way round — `getChildren(row)` for nested
 * data, or `getParentId(row)` for a flat table with a parent column — and the
 * model flattens it to the same list of entries adapters render.
 */
import type { ColumnDef } from "../types";

/**
 * One visual row of a tree: the row itself, plus where it sits.
 *
 * @internal
 */
export interface TreeEntry<TRow> {
  /** The row. */
  row: TRow;
  /** Its stable id. */
  key: string;
  /** Depth from zero — what the tree column indents by. */
  level: number;
  /** Whether it has children at all, loaded or not. */
  hasChildren: boolean;
  /** Whether its children are showing. */
  expanded: boolean;
  /** Its ancestors' ids, outermost first — what collapsing a parent hides. */
  path: readonly string[];
  /**
   * Every descendant's id, for selection: ticking a folder ticks what is in
   * it, and a parent shows as partly selected when only some are.
   */
  descendantIds: readonly string[];
  /** Whether children are being fetched for this node right now. */
  loading?: boolean;
}

/**
 * How a host declares the hierarchy.
 *
 * @internal
 */
export interface TreeShape<TRow> {
  /** Nested data: the children of a row, if any. */
  getChildren?: (row: TRow) => readonly TRow[] | undefined;
  /** Flat data: the id of a row's parent, if any. */
  getParentId?: (row: TRow) => string | undefined;
  /**
   * Whether a row has children the browser has not fetched yet. Without it a
   * node with no loaded children is a leaf, which is the right default for
   * data that is all in hand.
   */
  hasChildren?: (row: TRow) => boolean;
}

/**
 * What {@link buildTreeEntries} needs.
 *
 * @internal
 */
export interface BuildTreeEntriesOptions<TRow> extends TreeShape<TRow> {
  /** The rows, nested or flat. */
  rows: readonly TRow[];
  /** Row identity. */
  getRowId: (row: TRow) => string;
  /** Which nodes are expanded, by id. */
  expandedIds: ReadonlySet<string>;
  /** Nodes whose children are being fetched. */
  loadingIds?: ReadonlySet<string>;
}

/**
 * Flatten a hierarchy into the rows a table renders, in reading order.
 *
 * A collapsed node contributes itself and nothing beneath it. `descendantIds`
 * covers the whole subtree whether or not it is showing, because selecting a
 * folder means selecting what is in it — including the part currently folded
 * away.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link BuildTreeEntriesOptions}.
 * @returns The entries, in render order.
 *
 * @internal
 */
export function buildTreeEntries<TRow>(
  options: BuildTreeEntriesOptions<TRow>
): TreeEntry<TRow>[] {
  const {
    rows,
    getRowId,
    expandedIds,
    loadingIds,
    getChildren,
    getParentId,
    hasChildren,
  } = options;
  const childrenOf =
    getChildren ?? childrenFromParentIds(rows, getParentId, getRowId);
  const roots = getParentId
    ? rows.filter((row) => {
        const parent = getParentId(row);
        return (
          parent === undefined || !rows.some((r) => getRowId(r) === parent)
        );
      })
    : rows;

  const entries: TreeEntry<TRow>[] = [];

  /** Collect a subtree's ids, folded or not — selection covers all of it. */
  const descendantsOf = (row: TRow): string[] => {
    const ids: string[] = [];
    for (const child of childrenOf(row) ?? []) {
      ids.push(getRowId(child), ...descendantsOf(child));
    }
    return ids;
  };

  const walk = (list: readonly TRow[], level: number, path: string[]): void => {
    for (const row of list) {
      const key = getRowId(row);
      const children = childrenOf(row) ?? [];
      const expandable = children.length > 0 || hasChildren?.(row) === true;
      const expanded = expandable && expandedIds.has(key);
      entries.push({
        row,
        key,
        level,
        hasChildren: expandable,
        expanded,
        path,
        descendantIds: descendantsOf(row),
        loading: loadingIds?.has(key),
      });
      if (expanded && children.length > 0) {
        walk(children, level + 1, [...path, key]);
      }
    }
  };

  walk(roots, 0, []);
  return entries;
}

/**
 * Read children from a flat list keyed by parent id.
 *
 * Built once per call rather than scanned per row: a thousand rows scanned for
 * each of a thousand rows is a million comparisons for a table nobody would
 * call large.
 */
function childrenFromParentIds<TRow>(
  rows: readonly TRow[],
  getParentId: ((row: TRow) => string | undefined) | undefined,
  getRowId: (row: TRow) => string
): (row: TRow) => readonly TRow[] {
  if (!getParentId) return () => [];
  const byParent = new Map<string, TRow[]>();
  for (const row of rows) {
    const parent = getParentId(row);
    if (parent === undefined) continue;
    const siblings = byParent.get(parent) ?? [];
    siblings.push(row);
    byParent.set(parent, siblings);
  }
  return (row) => byParent.get(getRowId(row)) ?? [];
}

/**
 * Keep the rows that match, and every ancestor that leads to one.
 *
 * A filtered tree that dropped the folders would leave matching files with no
 * path to them — the reader would see a flat list and lose the one thing the
 * tree was for. Ancestors are kept even when they do not match themselves.
 *
 * @typeParam TRow - The row type.
 * @param options - The shape, the rows, and the predicate.
 * @returns The rows that survive, nested exactly as they arrived.
 *
 * @internal
 */
export function filterTreeRows<TRow>(options: {
  rows: readonly TRow[];
  getChildren: (row: TRow) => readonly TRow[] | undefined;
  /** Rebuild a row with the children that survived — the host owns its shape. */
  withChildren: (row: TRow, children: readonly TRow[]) => TRow;
  match: (row: TRow) => boolean;
}): TRow[] {
  const { rows, getChildren, withChildren, match } = options;
  return rows.flatMap((row) => {
    const kept = filterTreeRows({
      rows: getChildren(row) ?? [],
      getChildren,
      withChildren,
      match,
    });
    if (kept.length === 0 && !match(row)) return [];
    return [withChildren(row, kept)];
  });
}

/**
 * The style a tree column's cell carries at a given depth.
 *
 * Logical padding, so a tree indents from the right in Arabic and Hebrew
 * without a second rule — the same one grouping uses, at the same step, so a
 * table that has both does not step differently between them.
 *
 * @param level - Depth from zero.
 * @returns The style for the tree column's cell.
 *
 * @internal
 */
export function treeIndentStyle(level: number): {
  paddingInlineStart?: string;
} {
  return level > 0 ? { paddingInlineStart: `${level * 1.5}rem` } : {};
}

/**
 * The style a card carries at a given depth.
 *
 * A card is a block, not a cell, so the whole card steps in rather than its
 * text — on a narrow screen an indented card edge reads as hierarchy where an
 * indented line reads as a typo. Logical margin, so it steps from the right
 * in Arabic and Hebrew.
 *
 * @param level - Depth from zero.
 * @returns The style for the card.
 *
 * @internal
 */
export function treeCardStyle(level: number): {
  marginInlineStart?: string;
} {
  return level > 0 ? { marginInlineStart: `${level * 1.25}rem` } : {};
}

/**
 * Which column renders the chevron and the indent.
 *
 * @internal
 */
export function treeColumnKey<TRow>(
  columns: readonly ColumnDef<TRow>[],
  declared?: string
): string | undefined {
  if (declared !== undefined) return declared;
  return columns[0]?.key;
}

/**
 * One body row an adapter renders, tree or flat.
 *
 * @internal
 */
export interface BodyRowEntry<TRow> {
  /** The row. */
  row: TRow;
  /** Its position for `data-index` and cell navigation. */
  index: number;
  /**
   * Index in the page dataset when pinned rows left the window.
   * Equals `index` when pinning is off.
   */
  sourceIndex?: number;
  /** Its stable key. */
  key: string;
  /** Its place in the tree, when the table is one. */
  treeEntry?: TreeEntry<TRow>;
}

/**
 * The rows a body renders: the tree's visible entries when the host declared
 * a hierarchy, the (possibly windowed) rows otherwise.
 *
 * Nine adapters make the same choice, so they make it in one place — and each
 * body keeps a single `.map` over one list rather than a branch that has to
 * stay in step across nine files.
 *
 * @typeParam TRow - The row type.
 * @param rows - The flat rows, already windowed.
 * @param tree - The tree bundle, when one is armed.
 * @returns What to render, in reading order.
 *
 * @internal
 */
export function bodyRowEntries<TRow>(
  rows: readonly {
    row: TRow;
    index: number;
    key: string;
    sourceIndex?: number;
  }[],
  tree?: { entries: readonly TreeEntry<TRow>[] }
): BodyRowEntry<TRow>[] {
  if (tree) {
    return tree.entries.map((entry, position) => ({
      row: entry.row,
      index: position,
      key: entry.key,
      treeEntry: entry,
    }));
  }
  return rows.map((entry) => ({
    row: entry.row,
    index: entry.index,
    sourceIndex: entry.sourceIndex,
    key: entry.key,
  }));
}
