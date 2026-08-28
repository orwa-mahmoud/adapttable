/**
 * Groups computed by a server, rendered by the same table as local ones.
 *
 * A backend that can group is usually the only thing that CAN: it has the
 * whole dataset, and the browser has a page of it. So the server answers
 * `query.groupBy` with group rows — a value, a count, its aggregates, and
 * whatever children it chose to include — and this turns that answer into the
 * exact {@link GroupedFlatEntry} list local grouping produces.
 *
 * That reuse is the point. Every adapter already renders those entries, so
 * server-side grouping is not a second rendering path with its own bugs: it is
 * the same rows, filled from a different source of truth.
 */
import type { ReactNode } from "react";

import {
  formatGroupLabel,
  type GroupedFlatEntry,
  groupValueKey,
  makeGroupRowKey,
} from "../grouping/groupRows";

/**
 * One group row as a server returns it.
 *
 * Only `value` and `count` are required: a server that can count but not
 * aggregate, or group but not return children, is still useful and should not
 * have to send empty fields to say so.
 *
 * @public
 */
export interface QueryGroupRow<TRow = unknown> {
  /** The grouping value at this level — what the table shows as the label. */
  value: unknown;
  /**
   * How many leaves sit beneath it, per the server. This is the number the
   * header shows, and it is the server's to know: the browser holds a page.
   */
  count: number;
  /** Aggregates the server computed for this group, keyed by column. */
  aggregates?: Readonly<Record<string, unknown>>;
  /** Nested groups, when the server grouped by more than one key. */
  groups?: readonly QueryGroupRow<TRow>[];
  /**
   * The group's leaf rows, when the server included them. A server that sends
   * counts only leaves this out; the table then shows the header with its
   * count and asks for children when the group is opened.
   */
  rows?: readonly TRow[];
}

/**
 * A page of grouped results.
 *
 * @public
 */
export interface QueryGroupsPage<TRow = unknown> {
  /** The top-level groups, in the order the server wants them shown. */
  groups: readonly QueryGroupRow<TRow>[];
  /** Total leaves across every group, when the server knows it. */
  total?: number;
}

/**
 * What {@link serverGroupEntries} needs to lay a server's answer out.
 *
 * @public
 */
export interface ServerGroupEntriesOptions<TRow> {
  /** The groups the server returned. */
  groups: readonly QueryGroupRow<TRow>[];
  /** The grouping keys that were asked for, outermost first. */
  groupBy: readonly string[];
  /** Which groups are collapsed, by the same keys local grouping uses. */
  collapsedGroupIds: ReadonlySet<string>;
  /** Row identity, for selection and React keys. */
  getRowId: (row: TRow) => string;
  /** Override the blank-group label (default `"(blank)"`). */
  blankLabel?: string;
  /** Close every group with a footer carrying its aggregates. */
  footers?: boolean;
}

/**
 * Turn a server's group rows into the flat entries adapters render.
 *
 * Counts come from the server rather than from the rows in hand — a group of
 * 4,000 says 4,000 even when the response carried 20 of them. The aggregates
 * are the server's too, passed through as they arrived, so a `sum` computed
 * over the whole dataset is the one displayed.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link ServerGroupEntriesOptions}.
 * @returns The entries, in render order.
 *
 * @public
 */
export function serverGroupEntries<TRow>(
  options: ServerGroupEntriesOptions<TRow>
): GroupedFlatEntry<TRow>[] {
  const {
    groups,
    groupBy,
    collapsedGroupIds,
    getRowId,
    blankLabel,
    footers = false,
  } = options;
  const flat: GroupedFlatEntry<TRow>[] = [];
  let leafIndex = 0;

  const walk = (
    nodes: readonly QueryGroupRow<TRow>[],
    level: number,
    path: readonly string[]
  ): void => {
    const key = groupBy[level] ?? groupBy.at(-1) ?? "";
    for (const node of nodes) {
      const here = [...path, groupValueKey(node.value)];
      const groupKey = makeGroupRowKey(groupBy.slice(0, level + 1), here);
      const collapsed = collapsedGroupIds.has(groupKey);
      const rows = node.rows ?? [];
      const label = formatGroupLabel(node.value, blankLabel);

      flat.push({
        kind: "group",
        key: groupKey,
        value: node.value,
        label,
        level,
        groupBy: key,
        path: here,
        // The rows the server sent, which may be none: `count` is what the
        // header reports, and it is the server's number, not this one.
        leafRows: rows,
        leafIds: rows.map((row) => getRowId(row)),
        serverCount: node.count,
        aggregateCells: renderableAggregates(node.aggregates),
        collapsed,
      });
      if (collapsed) continue;

      if (node.groups && node.groups.length > 0) {
        walk(node.groups, level + 1, here);
      } else {
        for (const row of rows) {
          flat.push({
            kind: "row",
            key: getRowId(row),
            row,
            index: leafIndex++,
            groupKey,
          });
        }
      }

      if (footers) {
        flat.push({
          kind: "groupFooter",
          key: `${groupKey}:footer`,
          groupKey,
          level,
          groupBy: key,
          label,
          leafRows: rows,
          leafIds: rows.map((row) => getRowId(row)),
          aggregateCells: renderableAggregates(node.aggregates),
        });
      }
    }
  };

  walk(groups, 0, []);
  return flat;
}

/**
 * A server's aggregate values as things React can render.
 *
 * JSON carries numbers, strings, booleans and nulls; a table cell can render
 * the first three. Anything else — an object a backend chose to nest — is
 * stringified rather than thrown at React, which would crash the row.
 *
 * @param aggregates - The values the server sent, if any.
 * @returns Renderable cells, or `undefined` when there were none.
 */
function renderableAggregates(
  aggregates: Readonly<Record<string, unknown>> | undefined
): Partial<Record<string, ReactNode>> | undefined {
  if (!aggregates) return undefined;
  const cells: Partial<Record<string, ReactNode>> = {};
  for (const [key, value] of Object.entries(aggregates)) {
    if (value === null || value === undefined) continue;
    cells[key] =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? value
        : JSON.stringify(value);
  }
  return cells;
}
