import {
  type GroupedFlatEntry,
  groupSelectionState,
  type SelectionState,
  type TableLabels,
} from "@adapttable/core";
import {
  type ExtraEntry,
  groupIndentStyle,
  GroupToggleSpacer,
  isExtraEntry,
} from "@adapttable/core/adapter";
import { Button, Checkbox, Space, Typography } from "antd";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

import { ChevronRightIcon } from "../icons";
import { GroupMoreButton } from "./kitControls";

/** Marker field on synthetic antd dataSource rows that represent a group header. */
export const ADAPTTABLE_GROUP = "__adapttableGroup" as const;

/**
 * Synthetic dataSource record for a group header row. Leaf rows stay plain
 * `TRow` values so existing column accessors keep working.
 */
export interface AdaptTableGroupRow {
  [ADAPTTABLE_GROUP]: true;
  key: string;
  label: string;
  /** Depth from zero, so a nested header indents like every other kit's. */
  level: number;
  /** A closing total rather than a header: no chevron, no checkbox. */
  footer?: boolean;
  /** A row offering the next page of groups, or of this group's rows. */
  more?: { scope: "groups" | "rows"; groupKey?: string; remaining: number };
  /** How many leaves it has — the server's number when it grouped. */
  count: number;
  leafIds: readonly string[];
  aggregateCells?: Partial<Record<string, ReactNode>>;
  collapsed: boolean;
}

/** Marker field on synthetic antd dataSource rows that represent an extra slot. */
export const ADAPTTABLE_EXTRA = "__adapttableExtra" as const;

/** Synthetic dataSource record for a separator or full-width extra row. */
export interface AdaptTableExtraRow {
  [ADAPTTABLE_EXTRA]: true;
  key: string;
  extraKind: "separator" | "fullWidth";
  render?: () => ReactNode;
}

/** Type guard for synthetic extra-slot records. */
export function isAdaptTableExtraRow(
  record: unknown
): record is AdaptTableExtraRow {
  return (
    typeof record === "object" &&
    record !== null &&
    (record as AdaptTableExtraRow)[ADAPTTABLE_EXTRA] === true
  );
}

/** dataSource entry when grouping is armed: group header, extra slot, or leaf. */
export type GroupedDataRecord<TRow> =
  | AdaptTableGroupRow
  | AdaptTableExtraRow
  | TRow;

/** Type guard for synthetic group header records. */
export function isAdaptTableGroupRow(
  record: unknown
): record is AdaptTableGroupRow {
  return (
    typeof record === "object" &&
    record !== null &&
    (record as AdaptTableGroupRow)[ADAPTTABLE_GROUP] === true
  );
}

/** Map a host-injected extra onto an antd dataSource record. */
function toExtraDataRecord(entry: ExtraEntry): AdaptTableExtraRow {
  return {
    [ADAPTTABLE_EXTRA]: true,
    key: entry.key,
    extraKind: entry.kind,
    render: entry.kind === "fullWidth" ? entry.render : undefined,
  };
}

/** Map a group header, footer, or more-row onto an antd dataSource record. */
function toGroupDataRecord<TRow>(
  entry: Exclude<GroupedFlatEntry<TRow>, ExtraEntry | { kind: "row" }>
): AdaptTableGroupRow {
  return {
    [ADAPTTABLE_GROUP]: true,
    key: entry.key,
    label: entry.label,
    level: entry.level,
    footer: entry.kind === "groupFooter",
    more:
      entry.kind === "groupMore"
        ? {
            scope: entry.scope,
            groupKey: entry.groupKey,
            remaining: entry.remaining,
          }
        : undefined,
    count:
      (entry.kind === "group" ? entry.serverCount : undefined) ??
      entry.leafIds.length,
    leafIds: entry.leafIds,
    aggregateCells:
      entry.kind === "groupMore" ? undefined : entry.aggregateCells,
    collapsed: entry.kind === "group" && entry.collapsed,
  };
}

/**
 * Flatten chrome grouping entries into an antd `dataSource`: group headers
 * carry {@link ADAPTTABLE_GROUP}, extras carry {@link ADAPTTABLE_EXTRA},
 * leaf entries are the plain row objects.
 */
export function buildGroupedDataSource<TRow>(
  entries: readonly GroupedFlatEntry<TRow>[]
): GroupedDataRecord<TRow>[] {
  const records: GroupedDataRecord<TRow>[] = [];
  for (const entry of entries) {
    if (isExtraEntry(entry)) {
      records.push(toExtraDataRecord(entry));
      continue;
    }
    if (entry.kind === "row") {
      records.push(entry.row);
      continue;
    }
    records.push(toGroupDataRecord(entry));
  }
  return records;
}

/** Stable rowKey for grouped or plain records. */
export function groupedRowKey<TRow>(
  record: GroupedDataRecord<TRow>,
  getRowId: (row: TRow) => string
): string {
  if (isAdaptTableExtraRow(record)) return record.key;
  if (isAdaptTableGroupRow(record)) return record.key;
  return getRowId(record);
}

/**
 * Expand/collapse control for a group header — same chevron affordance as
 * row detail, wired to `labels.expandGroup` / `labels.collapseGroup`.
 */
export function GroupToggle({
  collapsed,
  labels,
  onClick,
}: Readonly<{
  collapsed: boolean;
  labels: Pick<Required<TableLabels>, "expandGroup" | "collapseGroup">;
  onClick: MouseEventHandler<HTMLElement>;
}>) {
  const expanded = !collapsed;
  return (
    <Button
      type="text"
      size="small"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={expanded ? labels.collapseGroup : labels.expandGroup}
      onClick={onClick}
      icon={
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <ChevronRightIcon size={14} />
        </span>
      }
    />
  );
}

const GROUP_HEADER_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontWeight: 600,
};

/**
 * Group header cell content: toggle + label + count, plus an optional
 * aggregate for this column when the header is not spanning.
 */
export function GroupHeaderCell({
  group,
  labels,
  onToggle,
  onShowMore,
  aggregate,
}: Readonly<{
  group: AdaptTableGroupRow;
  labels: Required<TableLabels>;
  onToggle: () => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore?: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  aggregate?: ReactNode;
}>) {
  return (
    <Space
      size={4}
      style={{ ...GROUP_HEADER_STYLE, ...groupIndentStyle(group.level) }}
      data-adapttable-part={
        group.footer === true ? "group-footer-cell" : "group-cell"
      }
    >
      {group.footer === true || group.more !== undefined ? (
        <GroupToggleSpacer />
      ) : (
        <GroupToggle
          collapsed={group.collapsed}
          labels={labels}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        />
      )}
      {group.more ? (
        <GroupMoreButton
          scope={group.more.scope}
          remaining={group.more.remaining}
          groupKey={group.more.groupKey}
          labels={labels}
          onShowMore={(entry) => onShowMore?.(entry)}
        />
      ) : (
        <Typography.Text strong data-adapttable-part="group-label">
          {group.footer === true ? labels.groupTotal(group.label) : group.label}
        </Typography.Text>
      )}
      {group.footer !== true && group.more === undefined && (
        <Typography.Text type="secondary" data-adapttable-part="group-count">
          {labels.groupCount(group.count)}
        </Typography.Text>
      )}
      {aggregate != null && aggregate !== false ? (
        <Typography.Text
          type="secondary"
          data-adapttable-part="group-aggregate"
        >
          {aggregate}
        </Typography.Text>
      ) : null}
    </Space>
  );
}

/** Tri-state checkbox for selecting every leaf in a group. */
export function GroupSelectionCheckbox({
  group,
  selection,
  labels,
}: Readonly<{
  group: AdaptTableGroupRow;
  selection: SelectionState;
  labels: Required<TableLabels>;
}>) {
  const state = groupSelectionState(group.leafIds, selection.selectedIds);
  return (
    <Checkbox
      data-adapttable-part="group-select"
      // Name the GROUP, not a row: "Select all: <group>" — the generic
      // row label made every group checkbox indistinguishable.
      aria-label={`${labels.selectAll}: ${group.label}`}
      checked={state === "all"}
      indeterminate={state === "some"}
      onChange={() => selection.toggleGroupLeaves(group.leafIds)}
    />
  );
}

/**
 * Mobile group header card — toggle + label + count (+ optional aggregates).
 */
export function GroupHeaderCard({
  group,
  labels,
  onToggle,
  onShowMore,
  selection,
  aggregateNodes,
}: Readonly<{
  group: AdaptTableGroupRow;
  labels: Required<TableLabels>;
  onToggle: () => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore?: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  selection?: SelectionState | null;
  aggregateNodes?: ReactNode;
}>) {
  return (
    <div
      data-adapttable-part="group-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        fontWeight: 600,
      }}
    >
      {selection ? (
        <GroupSelectionCheckbox
          group={group}
          selection={selection}
          labels={labels}
        />
      ) : null}
      <GroupToggle
        collapsed={group.collapsed}
        labels={labels}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      />
      {group.more ? (
        <GroupMoreButton
          scope={group.more.scope}
          remaining={group.more.remaining}
          groupKey={group.more.groupKey}
          labels={labels}
          onShowMore={(entry) => onShowMore?.(entry)}
        />
      ) : (
        <Typography.Text strong data-adapttable-part="group-label">
          {group.label}
        </Typography.Text>
      )}
      <Typography.Text type="secondary" data-adapttable-part="group-count">
        {labels.groupCount(group.count)}
      </Typography.Text>
      {aggregateNodes}
    </div>
  );
}
