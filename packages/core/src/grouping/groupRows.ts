import type { ReactNode } from "react";

import type { ExtraEntry } from "../rows/extraRows";
import type { ColumnDef } from "../types";
import { getPath } from "../utils/path";

/**
 * One visual row in a single-level grouped body: a group header, or a leaf
 * data row belonging to a group. Adapters switch on `kind`.
 *
 * @public
 */
export type GroupedFlatEntry<TRow> =
  | {
      kind: "group";
      /** Stable id: `group:${keys}:${valueKeys}`, unique down the whole tree. */
      key: string;
      /** Raw group value (from sortValue / path). */
      value: unknown;
      /** Display label for the header (stringified value, or "(blank)"). */
      label: string;
      /**
       * Depth from zero. With one grouping key every header is level 0; with
       * `["team", "status"]` the status headers are level 1, and adapters
       * indent by it.
       */
      level: number;
      /** Which column this level groups by. */
      groupBy: string;
      /** The value keys from the root down to here — the node's address. */
      path: readonly string[];
      /**
       * EVERY leaf beneath this header, not just its direct children: a
       * parent's count, its aggregates and its selection state all describe
       * the whole subtree, which is what a person reading a nested group
       * expects a number beside it to mean.
       */
      leafRows: readonly TRow[];
      leafIds: readonly string[];
      /**
       * How many leaves the SERVER says are in this group, when the grouping
       * was computed there. A server-grouped table holds a page of a group of
       * 4,000 and must still say 4,000; local grouping leaves this unset and
       * the count comes from `leafIds`.
       */
      serverCount?: number;
      /** Present when the host passed `groupAggregates`. */
      aggregateCells?: Partial<Record<string, ReactNode>>;
      collapsed: boolean;
    }
  | {
      /**
       * The closing row of a group, carrying the same aggregates its header
       * carries. Emitted only when the host asks for footers, and never for a
       * collapsed group — there is nothing between a closed header and its
       * footer to total.
       */
      kind: "groupFooter";
      /** Stable id: the group's key with a `:footer` suffix. */
      key: string;
      /** The group this closes. */
      groupKey: string;
      /** Depth of the group it closes. */
      level: number;
      /** Which column that group is grouped by. */
      groupBy: string;
      /** The group's display label, for a "Core total" caption. */
      label: string;
      leafRows: readonly TRow[];
      leafIds: readonly string[];
      aggregateCells?: Partial<Record<string, ReactNode>>;
    }
  | {
      /**
       * "There are more" — a row offering the rest of a page of groups, or the
       * rest of a group's leaves. Emitted only when the host set a page size,
       * and only while something is still hidden.
       */
      kind: "groupMore";
      /** Stable id. */
      key: string;
      /** Which group's leaves are being paged, or absent for top-level groups. */
      groupKey?: string;
      /** Depth the row sits at, so it indents with what it belongs to. */
      level: number;
      /** Whether this offers more groups or more rows inside one. */
      scope: "groups" | "rows";
      /** How many are still hidden. */
      remaining: number;
      /**
       * Empty, and present so every group-shaped entry has the same fields:
       * one adapter component renders headers, footers and this row, and a
       * missing field there is a conditional in eight kits.
       */
      leafRows: readonly TRow[];
      leafIds: readonly string[];
      label: string;
    }
  | {
      kind: "row";
      key: string;
      row: TRow;
      /** Index among leaves in the flat model (stable for selection chrome). */
      index: number;
      groupKey: string;
    }
  | ExtraEntry;

/**
 * One group, as sorting and filtering see it — before it becomes a row.
 *
 * The leaves are here because every aggregate is a function of them: sorting
 * groups "by their total" is `sum(b.leafRows) - sum(a.leafRows)`, computed from
 * the same rows the aggregate mapper reads. Comparing rendered aggregate cells
 * instead would mean comparing ReactNodes, which is not an ordering.
 *
 * @public
 */
export interface GroupNode<TRow> {
  /** The raw bucket value. */
  value: unknown;
  /** Its display label. */
  label: string;
  /** Depth from zero. */
  level: number;
  /** Which column this level groups by. */
  groupBy: string;
  /** Every leaf beneath it, including through nested levels. */
  leafRows: readonly TRow[];
}

/**
 * How to order groups within their parent.
 *
 * @public
 */
export type GroupSort<TRow> =
  | "label"
  | "label-desc"
  | "count"
  | "count-desc"
  | ((a: GroupNode<TRow>, b: GroupNode<TRow>) => number);

/**
 * Same mapper signature as `summaryRow` — one API for page footer + groups.
 *
 * @public
 */
export type GroupAggregatesFn<TRow> = (
  rows: readonly TRow[]
) => Partial<Record<string, ReactNode>>;

export interface BuildGroupedFlatModelOptions<TRow> {
  /** Leaf rows to partition (frontend: prefer `allFilteredRows`). */
  rows: readonly TRow[];
  /**
   * Column key to group by, or an ordered list for nested grouping —
   * `["team", "status"]` puts each status inside its team.
   */
  groupBy: string | readonly string[];
  /** Visible columns, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** Row identity function. */
  getRowId: (row: TRow) => string;
  /** Collapsed group keys (from {@link useGroupCollapse}). */
  collapsedGroupIds: ReadonlySet<string>;
  /** Optional per-group cells — same shape as `summaryRow`. */
  aggregates?: GroupAggregatesFn<TRow>;
  /** Override blank-group label (default `"(blank)"`). */
  blankLabel?: string;
  /**
   * Close every group with a footer row carrying its aggregates. Off by
   * default, and pointless without `aggregates` — a footer with nothing to
   * total is a blank row.
   */
  footers?: boolean;
  /**
   * Order groups within their parent. Without it they keep first-seen order,
   * which is the order the source's own sort produced.
   */
  sort?: GroupSort<TRow>;
  /** Keep only the groups this answers true for, at every level. */
  filter?: (group: GroupNode<TRow>) => boolean;
  /**
   * Show at most this many top-level groups at a time. A table grouped by
   * customer can have ten thousand groups, and rendering all of them to show
   * the first screen is the same mistake as rendering ten thousand rows.
   */
  groupPageSize?: number;
  /** Show at most this many leaves inside each group. */
  rowPageSize?: number;
  /** How many are currently revealed, from {@link GroupPaging}. */
  paging?: GroupPaging;
}

/**
 * How much of a paged group model the reader has asked to see.
 *
 * @public
 */
export interface GroupPaging {
  /** Extra top-level groups revealed beyond the first page. */
  groups?: number;
  /** Extra leaves revealed per group key. */
  rows?: Readonly<Record<string, number>>;
}

/**
 * Resolve the value used to bucket a row for `groupBy`. Prefers the column's
 * `sortValue` (same primitive as client sort), then a path lookup on the
 * column key — never the JSX accessor.
 */
export function resolveGroupValue<TRow>(
  row: TRow,
  groupBy: string,
  column: ColumnDef<TRow> | undefined
): unknown {
  if (column?.sortValue) return column.sortValue(row);
  const path = column?.key ?? groupBy;
  return getPath(row, path);
}

/**
 * Stable string key for a group bucket. Type-tagged so distinct values
 * never share a bucket across types — number `5` vs string `"5"`, boolean
 * `true` vs string `"true"`, a Date vs its own ISO string. Null-ish and
 * empty-string values deliberately share the one blank bucket (they all
 * render the same blank label; splitting them would show several
 * identical "(blank)" groups).
 *
 * @public
 */
export function groupValueKey(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "number" || typeof value === "bigint") {
    return `n:${String(value)}`;
  }
  if (typeof value === "boolean") return `b:${String(value)}`;
  if (value instanceof Date) return `d:${value.toISOString()}`;
  try {
    return `j:${JSON.stringify(value)}`;
  } catch {
    return `o:${Object.prototype.toString.call(value)}`;
  }
}

/**
 * Render a group's value as its header caption.
 *
 * @public
 */
export function formatGroupLabel(
  value: unknown,
  blankLabel = "(blank)"
): string {
  if (value == null || value === "") return blankLabel;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/**
 * A group node's stable id.
 *
 * Both halves carry the whole path, so "Core > blocked" and "Web > blocked"
 * are different nodes — collapse one and the other stays open, which a key of
 * just the value could never express.
 *
 * @param keys - The grouping keys from the root down to this level.
 * @param valueKeys - The value keys down to this node.
 * @returns The id.
 */
export function makeGroupRowKey(
  keys: string | readonly string[],
  valueKeys: string | readonly string[]
): string {
  const k = typeof keys === "string" ? keys : keys.join(">");
  const v = typeof valueKeys === "string" ? valueKeys : valueKeys.join(">");
  return `group:${k}:${v}`;
}

/**
 * One bucket in a grouped partition tree, before it becomes a rendered row.
 *
 * Incremental re-evaluation keeps this tree up to date and hands it to
 * {@link flattenGroupPartitions} so a patched row does not re-hash every
 * other row's group key.
 */
export interface GroupPartition<TRow> {
  /** The raw bucket value. */
  value: unknown;
  /** {@link groupValueKey} of `value`. */
  valueKey: string;
  /** Every leaf beneath this node, in source (sorted) order. */
  rows: readonly TRow[];
  /** Nested buckets, when another grouping key remains. */
  children?: readonly GroupPartition<TRow>[];
}

/**
 * The grouping keys {@link buildGroupedFlatModel} will actually use — blank
 * entries dropped, so `["", "team"]` is just `"team"`.
 *
 * @param groupBy - A single key or an ordered list.
 * @returns The non-empty keys, outermost first.
 */
export function groupingKeys(groupBy: string | readonly string[]): string[] {
  return (typeof groupBy === "string" ? [groupBy] : groupBy).filter(
    (key) => key.length > 0
  );
}

/**
 * Partition rows into the nested bucket tree grouping walks.
 *
 * Order is first-seen at each level, which preserves whatever sort the
 * source already applied.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows to partition.
 * @param groupBy - Column key, or an ordered list for nested grouping.
 * @param columns - The columns, for each key's `sortValue`.
 * @returns The top-level buckets, or an empty list when there is no key.
 */
export function partitionGroupedRows<TRow>(
  rows: readonly TRow[],
  groupBy: string | readonly string[],
  columns: readonly ColumnDef<TRow>[]
): GroupPartition<TRow>[] {
  const keys = groupingKeys(groupBy);
  if (keys.length === 0) return [];
  return partitionLevel(rows, keys, 0, columns);
}

function partitionLevel<TRow>(
  rows: readonly TRow[],
  keys: readonly string[],
  level: number,
  columns: readonly ColumnDef<TRow>[]
): GroupPartition<TRow>[] {
  const { order, buckets } = bucketBy(rows, keys[level]!, columns);
  return order.map((valueKey) => {
    const bucket = buckets.get(valueKey)!;
    return {
      value: bucket.value,
      valueKey,
      rows: bucket.rows,
      children:
        level + 1 < keys.length
          ? partitionLevel(bucket.rows, keys, level + 1, columns)
          : undefined,
    };
  });
}

/**
 * Turn a partition tree into the flat model adapters render.
 *
 * This is the emit half of {@link buildGroupedFlatModel}: filtering, ordering,
 * paging, collapse, footers. Incremental grouping updates the tree, then
 * calls this instead of re-bucketing the world.
 *
 * @typeParam TRow - The row type.
 * @param partitions - The tree {@link partitionGroupedRows} (or an
 *   incremental update) produced.
 * @param options - The same options as the full builder, minus `rows`.
 * @returns The entries, in render order.
 */
export function flattenGroupPartitions<TRow>(
  partitions: readonly GroupPartition<TRow>[],
  options: Omit<BuildGroupedFlatModelOptions<TRow>, "rows">
): GroupedFlatEntry<TRow>[] {
  const keys = groupingKeys(options.groupBy);
  if (keys.length === 0 || partitions.length === 0) return [];

  const {
    getRowId,
    collapsedGroupIds,
    aggregates,
    blankLabel,
    footers = false,
    sort,
    filter,
    groupPageSize,
    rowPageSize,
    paging,
  } = options;
  const flat: GroupedFlatEntry<TRow>[] = [];
  let leafIndex = 0;

  const walk = (
    levelPartitions: readonly GroupPartition<TRow>[],
    level: number,
    path: readonly string[]
  ): void => {
    const key = keys[level]!;

    // Filtering and ordering happen on the whole level at once, before any of
    // it is emitted: a group dropped here takes its leaves with it, and one
    // moved here moves its whole subtree.
    const nodes = levelPartitions.flatMap((part) => {
      const node: GroupNode<TRow> = {
        value: part.value,
        label: formatGroupLabel(part.value, blankLabel),
        level,
        groupBy: key,
        leafRows: part.rows,
      };
      return filter && !filter(node)
        ? []
        : [{ part, valueKey: part.valueKey, node }];
    });
    if (sort) nodes.sort((a, b) => compareGroups(a.node, b.node, sort));

    // Only the top level pages: a nested level is already inside a group the
    // reader chose to open, and hiding part of what they opened would be a
    // second "more" to hunt for.
    const groupLimit = pageLimit(
      nodes.length,
      level === 0 ? groupPageSize : undefined,
      paging?.groups
    );
    const shown = nodes.slice(0, groupLimit);
    const hiddenGroups = nodes.length - shown.length;

    for (const { part, valueKey, node } of shown) {
      const here = [...path, valueKey];
      const groupKey = makeGroupRowKey(keys.slice(0, level + 1), here);
      const collapsed = collapsedGroupIds.has(groupKey);
      const aggregateCells = aggregates?.(part.rows);
      const label = node.label;

      flat.push({
        kind: "group",
        key: groupKey,
        value: part.value,
        label,
        level,
        groupBy: key,
        path: here,
        leafRows: part.rows,
        leafIds: part.rows.map((row) => getRowId(row)),
        aggregateCells,
        collapsed,
      });
      if (collapsed) continue;

      if (level + 1 < keys.length) {
        walk(part.children ?? [], level + 1, here);
      } else {
        leafIndex = emitLeaves(flat, part.rows, {
          groupKey,
          level,
          getRowId,
          from: leafIndex,
          limit: pageLimit(
            part.rows.length,
            rowPageSize,
            paging?.rows?.[groupKey]
          ),
        });
      }

      // The footer closes the group AFTER everything inside it, including any
      // nested groups and their own footers — innermost totals first, exactly
      // as the indentation reads.
      if (footers) {
        flat.push({
          kind: "groupFooter",
          key: `${groupKey}:footer`,
          groupKey,
          level,
          groupBy: key,
          label,
          leafRows: part.rows,
          leafIds: part.rows.map((row) => getRowId(row)),
          aggregateCells,
        });
      }
    }

    if (hiddenGroups > 0) {
      flat.push(
        moreEntry("groups", hiddenGroups, level, undefined, path.join(">"))
      );
    }
  };

  walk(partitions, 0, []);
  return flat;
}

/**
 * Partition leaf rows into the flat model adapters render: a group header,
 * then whatever sits under it — nested headers first when there is more than
 * one grouping key, then the leaves.
 *
 * Flat rather than nested on purpose: a windowing virtualizer can only measure
 * and slice a list, so the tree is expressed as depth on each entry instead of
 * as children. Group order follows first-seen value order within each parent,
 * which keeps the sort the source already applied.
 *
 * A collapsed header emits nothing beneath it — not its child headers and not
 * their leaves — so collapsing a top-level group hides the whole subtree in
 * one step.
 *
 * @typeParam TRow - The row type.
 * @param options - See `BuildGroupedFlatModelOptions`.
 * @returns The entries, in render order.
 *
 * @public
 */
export function buildGroupedFlatModel<TRow>(
  options: BuildGroupedFlatModelOptions<TRow>
): GroupedFlatEntry<TRow>[] {
  return flattenGroupPartitions(
    partitionGroupedRows(options.rows, options.groupBy, options.columns),
    options
  );
}

/**
 * Order two groups by a {@link GroupSort}.
 *
 * Labels compare with `localeCompare`, so "Ärger" lands where a reader expects
 * rather than after "Zulu"; counts compare numerically.
 *
 * @typeParam TRow - The row type.
 * @param a - The first group.
 * @param b - The second group.
 * @param sort - The ordering asked for.
 * @returns Negative, zero or positive, as a comparator does.
 */
function compareGroups<TRow>(
  a: GroupNode<TRow>,
  b: GroupNode<TRow>,
  sort: GroupSort<TRow>
): number {
  if (typeof sort === "function") return sort(a, b);
  if (sort === "label") return a.label.localeCompare(b.label);
  if (sort === "label-desc") return b.label.localeCompare(a.label);
  if (sort === "count") return a.leafRows.length - b.leafRows.length;
  return b.leafRows.length - a.leafRows.length;
}

/**
 * Emit one group's leaf rows, plus the offer for any it is holding back.
 *
 * @typeParam TRow - The row type.
 * @param flat - The entry list being built, appended to in place.
 * @param rows - The group's leaves.
 * @param options - Where they belong and how many to show.
 * @returns The next leaf index, so numbering continues across groups.
 */
function emitLeaves<TRow>(
  flat: GroupedFlatEntry<TRow>[],
  rows: readonly TRow[],
  options: {
    groupKey: string;
    level: number;
    getRowId: (row: TRow) => string;
    from: number;
    limit: number;
  }
): number {
  const { groupKey, level, getRowId, from, limit } = options;
  let index = from;
  for (const row of rows.slice(0, limit)) {
    flat.push({
      kind: "row",
      key: getRowId(row),
      row,
      index: index++,
      groupKey,
    });
  }
  const hidden = Math.max(0, rows.length - limit);
  if (hidden > 0) flat.push(moreEntry("rows", hidden, level + 1, groupKey));
  return index;
}

/**
 * How many of something to show: everything without a page size, and one page
 * plus whatever has been revealed with one.
 *
 * @param total - How many there are.
 * @param pageSize - The page size, when the host set one.
 * @param revealed - How many extra have been asked for.
 * @returns The count to render.
 */
function pageLimit(
  total: number,
  pageSize: number | undefined,
  revealed: number | undefined
): number {
  if (!pageSize) return total;
  return Math.min(total, pageSize + (revealed ?? 0));
}

/**
 * Partition rows into ordered buckets for one grouping key.
 *
 * Order is first-seen, which preserves whatever sort the source applied — the
 * rows arrive sorted and the groups come out in the order those rows named
 * them.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows to partition.
 * @param key - The grouping key for this level.
 * @param columns - The columns, for the key's `sortValue`.
 * @returns The bucket keys in order, and the buckets themselves.
 */
function bucketBy<TRow>(
  rows: readonly TRow[],
  key: string,
  columns: readonly ColumnDef<TRow>[]
): {
  order: string[];
  buckets: Map<string, { value: unknown; rows: TRow[] }>;
} {
  const column = columns.find((c) => c.key === key);
  const order: string[] = [];
  const buckets = new Map<string, { value: unknown; rows: TRow[] }>();
  for (const row of rows) {
    const value = resolveGroupValue(row, key, column);
    const valueKey = groupValueKey(value);
    let bucket = buckets.get(valueKey);
    if (!bucket) {
      bucket = { value, rows: [] };
      buckets.set(valueKey, bucket);
      order.push(valueKey);
    }
    bucket.rows.push(row);
  }
  return { order, buckets };
}

/**
 * The "there are more" row, for either scope.
 *
 * @typeParam TRow - The row type.
 * @param scope - Whether more groups or more rows are hidden.
 * @param remaining - How many.
 * @param level - The depth the row sits at.
 * @param groupKey - The group whose rows are hidden, for a `"rows"` offer.
 * @param pathKey - The path, so a nested level's offer has its own id.
 * @returns The entry.
 */
function moreEntry<TRow>(
  scope: "groups" | "rows",
  remaining: number,
  level: number,
  groupKey?: string,
  pathKey = ""
): GroupedFlatEntry<TRow> {
  return {
    kind: "groupMore",
    key: groupKey ? `${groupKey}:more` : `group-more:${level}:${pathKey}`,
    groupKey,
    level,
    scope,
    remaining,
    leafRows: [],
    leafIds: [],
    label: "",
  };
}
