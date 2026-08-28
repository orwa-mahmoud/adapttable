import type { ReactNode } from "react";

import type { ColumnDef, ColumnGroupShow } from "../types";
import {
  COLUMN_GROUP_ID_SEP,
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  columnGroupId,
  columnGroupPath,
  type GroupedHeaderAlign,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
} from "./headerGroups";

/**
 * A parent header with its own children. Collapse options live here, not
 * on the table: each group decides whether a collapsed state is an arrow
 * stub, a kept child, or a cell the host draws.
 *
 * @public
 */
export interface ColumnGroupDef<TRow> {
  /** Caption on the spanning header cell, and the group's id. */
  readonly header: string;
  /** Nested groups or leaf columns. */
  readonly children: readonly ColumnInput<TRow>[];
  /**
   * Leaf `key` to keep when this group is collapsed. Omit with
   * {@link ColumnGroupDef.collapsedRender} omitted for an arrow stub.
   */
  readonly collapsedKey?: string;
  /**
   * Cell shown for every row while this group is collapsed. Takes
   * precedence over {@link ColumnGroupDef.collapsedKey}.
   */
  readonly collapsedRender?: (row: TRow) => ReactNode;
  /**
   * Keep these children adjacent through reorder. Default `true` for a
   * tree group; the flat `column.group` shortcut still splits on drag.
   */
  readonly marryChildren?: boolean;
  /** Native tooltip on the group header, when set. */
  readonly headerTooltip?: string;
  /**
   * Alignment of this group's spanning header. Default `"center"` — the
   * value adapters used when this was hardcoded. Pass `"start"` or `"end"`
   * to opt out.
   */
  readonly align?: GroupedHeaderAlign;
}

/**
 * A leaf `ColumnDef` or a {@link ColumnGroupDef} parent.
 *
 * @public
 */
export type ColumnInput<TRow> = ColumnDef<TRow> | ColumnGroupDef<TRow>;

/**
 * Collapse policy recorded for one parent while flattening a tree.
 *
 * @public
 */
export interface ColumnGroupRecord<TRow> {
  /** Stable id built from the group's path. */
  readonly id: string;
  /** Caption on the group header. */
  readonly label: string;
  /** Column shown as the summary while the group is collapsed. */
  readonly collapsedKey?: string;
  /** Renders a synthetic summary cell while collapsed. */
  readonly collapsedRender?: (row: TRow) => ReactNode;
  /** Keeps the group's columns together when columns are reordered. */
  readonly marryChildren: boolean;
  /** Tooltip on the group header. */
  readonly headerTooltip?: string;
  /** How the group header's caption aligns. */
  readonly align?: GroupedHeaderAlign;
  /** Keys of the columns under this group. */
  readonly childKeys: readonly string[];
}

/**
 * True when this column input is a parent with children.
 *
 * @internal
 */
export function isColumnGroup<TRow>(
  column: ColumnInput<TRow>
): column is ColumnGroupDef<TRow> {
  return "children" in column && Array.isArray(column.children);
}

/**
 * Flatten a mixed column tree into leaves. Tree parents become `group`
 * paths on those leaves; collapse options are in `FlattenedColumns.groups`.
 *
 * @internal
 */
export function flattenColumnTree<TRow>(
  columns: readonly ColumnInput<TRow>[]
): FlattenedColumns<TRow> {
  const leaves: ColumnDef<TRow>[] = [];
  const groups = new Map<string, MutableGroup<TRow>>();
  walk(columns, [], leaves, groups);
  for (const leaf of leaves) {
    const path = columnGroupPath(leaf);
    for (let depth = 1; depth <= path.length; depth += 1) {
      const id = columnGroupId(path.slice(0, depth));
      groups.get(id)?.childKeys.push(leaf.key);
    }
  }
  const frozen = new Map<string, ColumnGroupRecord<TRow>>();
  for (const [id, record] of groups) {
    frozen.set(id, { ...record, childKeys: [...record.childKeys] });
  }
  return { leaves, groups: frozen };
}

/**
 * Leaves plus the parent records {@link flattenColumnTree} collected.
 *
 * @internal
 */
export interface FlattenedColumns<TRow> {
  /** The columns themselves, in render order. */
  readonly leaves: ColumnDef<TRow>[];
  /** The header rows above them. */
  readonly groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
}

/**
 * Hide leaves under collapsed groups according to each parent's options.
 *
 * Default (no `collapsedKey`, no `collapsedRender`, no `groupShow: "closed"`
 * child): a thin stub column. `collapsedRender` wins over `collapsedKey`.
 *
 * @internal
 */
export function applyCollapsedColumnGroups<TRow>(
  columns: readonly ColumnDef<TRow>[],
  collapsedIds: readonly string[],
  groups: ReadonlyMap<string, ColumnGroupRecord<TRow>> = new Map()
): readonly ColumnDef<TRow>[] {
  if (collapsedIds.length === 0) return columns;
  const collapsed = new Set(collapsedIds);
  const keep = columns.map((column) =>
    shouldKeepLeaf(column, collapsed, groups)
  );
  const inserted = new Set<string>();
  const out: ColumnDef<TRow>[] = [];
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index]!;
    if (keep[index] === true) {
      out.push(column);
      // A later contiguous run of the same group (flat `group:` split by
      // reorder) gets its own stub rather than vanishing with no chrome.
      inserted.clear();
      continue;
    }
    appendCollapsedChrome(column, index, {
      columns,
      keep,
      collapsed,
      groups,
      inserted,
      out,
    });
  }
  return out;
}

/**
 * True when `nextOrder` still keeps every married group's children in one
 * contiguous block. Used to reject a reorder that would split a tree group.
 *
 * @internal
 */
export function marriedOrderHolds<TRow>(
  nextOrder: readonly string[],
  groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>
): boolean {
  for (const record of groups.values()) {
    if (!record.marryChildren) continue;
    const childKeys = new Set(record.childKeys);
    const hits: number[] = [];
    for (let index = 0; index < nextOrder.length; index += 1) {
      if (childKeys.has(nextOrder[index]!)) hits.push(index);
    }
    if (hits.length <= 1) continue;
    const first = hits[0]!;
    const last = hits.at(-1)!;
    if (last - first !== hits.length - 1) return false;
  }
  return true;
}

interface MutableGroup<TRow> {
  id: string;
  label: string;
  collapsedKey?: string;
  collapsedRender?: (row: TRow) => ReactNode;
  marryChildren: boolean;
  headerTooltip?: string;
  align?: GroupedHeaderAlign;
  childKeys: string[];
}

function walk<TRow>(
  nodes: readonly ColumnInput<TRow>[],
  path: readonly string[],
  leaves: ColumnDef<TRow>[],
  groups: Map<string, MutableGroup<TRow>>
): void {
  for (const node of nodes) {
    if (isColumnGroup(node)) {
      const nextPath = [...path, node.header];
      const id = columnGroupId(nextPath);
      groups.set(id, {
        id,
        label: node.header,
        collapsedKey: node.collapsedKey,
        collapsedRender: node.collapsedRender,
        marryChildren: node.marryChildren ?? true,
        headerTooltip: node.headerTooltip,
        align: node.align,
        childKeys: [],
      });
      walk(node.children, nextPath, leaves, groups);
      continue;
    }
    leaves.push({
      ...node,
      group: inheritedGroup(node, path),
    });
  }
}

function inheritedGroup<TRow>(
  node: ColumnDef<TRow>,
  path: readonly string[]
): ColumnDef<TRow>["group"] {
  let group: ColumnDef<TRow>["group"] = node.group;
  if (path.length === 1) {
    group = path[0];
  } else if (path.length > 1) {
    group = path;
  }
  return group;
}

function appendCollapsedChrome<TRow>(
  column: ColumnDef<TRow>,
  index: number,
  pass: {
    columns: readonly ColumnDef<TRow>[];
    keep: readonly boolean[];
    collapsed: ReadonlySet<string>;
    groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
    inserted: Set<string>;
    out: ColumnDef<TRow>[];
  }
): void {
  for (const id of collapsedAncestors(column, pass.collapsed)) {
    if (pass.inserted.has(id)) continue;
    if (groupHasKeptLeaf(id, pass.columns, pass.keep)) {
      pass.inserted.add(id);
      continue;
    }
    const record = pass.groups.get(id);
    const path = id.split(COLUMN_GROUP_ID_SEP);
    pass.out.push(
      record?.collapsedRender
        ? renderColumn(id, path, record, index)
        : stubColumn(id, path, record, index)
    );
    pass.inserted.add(id);
  }
}

function collapsedAncestors<TRow>(
  column: ColumnDef<TRow>,
  collapsed: ReadonlySet<string>
): string[] {
  const path = columnGroupPath(column);
  const ids: string[] = [];
  for (let depth = 1; depth <= path.length; depth += 1) {
    const id = columnGroupId(path.slice(0, depth));
    if (collapsed.has(id)) ids.push(id);
  }
  return ids;
}

function shouldKeepLeaf<TRow>(
  column: ColumnDef<TRow>,
  collapsed: ReadonlySet<string>,
  groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>
): boolean {
  if (isColumnGroupStubKey(column.key) || isColumnGroupRenderKey(column.key)) {
    return false;
  }
  const ancestors = collapsedAncestors(column, collapsed);
  if (ancestors.length === 0) return true;
  for (const id of ancestors) {
    const show = resolveGroupShow(column, groups.get(id));
    if (show === "always") continue;
    if (show === "closed") continue;
    return false;
  }
  return true;
}

function resolveGroupShow<TRow>(
  column: ColumnDef<TRow>,
  record: ColumnGroupRecord<TRow> | undefined
): ColumnGroupShow {
  if (column.groupShow !== undefined) return column.groupShow;
  if (record?.collapsedRender) return "open";
  if (record?.collapsedKey === column.key) return "closed";
  return "open";
}

function groupHasKeptLeaf<TRow>(
  id: string,
  columns: readonly ColumnDef<TRow>[],
  keep: readonly boolean[]
): boolean {
  return columns.some((column, index) => {
    if (keep[index] !== true) return false;
    return collapsedAncestors(column, new Set([id])).length > 0;
  });
}

function stubColumn<TRow>(
  id: string,
  path: readonly string[],
  record: ColumnGroupRecord<TRow> | undefined,
  index: number
): ColumnDef<TRow> {
  return {
    key: `${COLUMN_GROUP_STUB_PREFIX}${id}:${String(index)}`,
    header: "",
    headerTooltip: record?.headerTooltip,
    width: COLUMN_GROUP_STUB_WIDTH,
    minWidth: COLUMN_GROUP_STUB_WIDTH,
    maxWidth: COLUMN_GROUP_STUB_WIDTH,
    accessor: () => null,
    group: path.length === 1 ? path[0] : path,
    hideOnMobile: true,
    sortable: false,
  };
}

function renderColumn<TRow>(
  id: string,
  path: readonly string[],
  record: ColumnGroupRecord<TRow>,
  index: number
): ColumnDef<TRow> {
  const render = record.collapsedRender;
  return {
    key: `${COLUMN_GROUP_RENDER_PREFIX}${id}:${String(index)}`,
    header: "",
    headerTooltip: record.headerTooltip,
    width: 180,
    accessor: render ? (row) => render(row) : () => null,
    group: path.length === 1 ? path[0] : path,
    sortable: false,
  };
}
