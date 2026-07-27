import {
  type GroupedFlatEntry,
  groupSelectionState,
  type SelectionState,
  type TableLabels,
} from "@adapttable/core";
import { Button, Checkbox, Space, Typography } from "antd";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

import { ChevronRightIcon } from "../icons";

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
  leafIds: readonly string[];
  aggregateCells?: Partial<Record<string, ReactNode>>;
  collapsed: boolean;
}

/** dataSource entry when grouping is armed: group header or leaf row. */
export type GroupedDataRecord<TRow> = AdaptTableGroupRow | TRow;

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

/** Map a grouped flat entry onto an antd dataSource record. */
function toGroupedDataRecord<TRow>(
  entry: GroupedFlatEntry<TRow>
): GroupedDataRecord<TRow> {
  const record: GroupedDataRecord<TRow> =
    entry.kind === "group"
      ? {
          [ADAPTTABLE_GROUP]: true,
          key: entry.key,
          label: entry.label,
          leafIds: entry.leafIds,
          aggregateCells: entry.aggregateCells,
          collapsed: entry.collapsed,
        }
      : entry.row;
  return record;
}

/**
 * Flatten chrome grouping entries into an antd `dataSource`: group headers
 * carry {@link ADAPTTABLE_GROUP}, leaf entries are the plain row objects.
 */
export function buildGroupedDataSource<TRow>(
  entries: readonly GroupedFlatEntry<TRow>[]
): GroupedDataRecord<TRow>[] {
  return entries.map(toGroupedDataRecord);
}

/** Stable rowKey for grouped or plain records. */
export function groupedRowKey<TRow>(
  record: GroupedDataRecord<TRow>,
  getRowId: (row: TRow) => string
): string {
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
  aggregate,
}: Readonly<{
  group: AdaptTableGroupRow;
  labels: Required<TableLabels>;
  onToggle: () => void;
  aggregate?: ReactNode;
}>) {
  return (
    <Space size={4} style={GROUP_HEADER_STYLE} data-adapttable-part="group-row">
      <GroupToggle
        collapsed={group.collapsed}
        labels={labels}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      />
      <Typography.Text strong>{group.label}</Typography.Text>
      <Typography.Text type="secondary">
        {labels.groupCount(group.leafIds.length)}
      </Typography.Text>
      {aggregate != null && aggregate !== false ? (
        <Typography.Text type="secondary">{aggregate}</Typography.Text>
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
  selection,
  aggregateNodes,
}: Readonly<{
  group: AdaptTableGroupRow;
  labels: Required<TableLabels>;
  onToggle: () => void;
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
      <Typography.Text strong>{group.label}</Typography.Text>
      <Typography.Text type="secondary">
        {labels.groupCount(group.leafIds.length)}
      </Typography.Text>
      {aggregateNodes}
    </div>
  );
}
