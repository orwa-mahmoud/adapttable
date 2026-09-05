import {
  groupAggregateEntries,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
} from "@adapttable/core";
import type { GroupedFlatEntry, TableLabels } from "@adapttable/core";
import type { SelectionState } from "@adapttable/react";

import type { ColumnDef } from "@adapttable/react";

import {
  groupIndentStyle,
  groupRowParts,
  GroupToggleSpacer,
  resolveMobileLabel,
} from "@adapttable/react/adapter";
import { ActionIcon, Card, Checkbox, Group, Table, Text } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";

import { ChevronRightIcon } from "../icons";
import { GroupMoreButton } from "./kitControls";

function GroupToggle({
  expanded,
  expandLabel,
  collapseLabel,
  onToggle,
}: Readonly<{
  expanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
}>) {
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="sm"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={onToggle}
    >
      <ChevronRightIcon
        size={14}
        style={{
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
        }}
      />
    </ActionIcon>
  );
}

/** Mantine group header row for the desktop table. */
export function GroupHeaderRow<TRow>({
  entry,
  columns,
  leadingCells,
  showActions,
  getCellProps,
  selection,
  labels,
  onToggleCollapse,
  onShowMore,
}: Readonly<{
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** The data columns as rendered, so a subtotal lands under its own. */
  columns: readonly ColumnDef<TRow>[];
  /** Edge cells before the first data column (chevron, checkbox). */
  leadingCells: number;
  /** Whether a trailing actions column needs an empty cell. */
  showActions: boolean;
  /** The table's per-column cell props, so a number inherits its alignment. */
  getCellProps: (column: ColumnDef<TRow>) => Record<string, unknown>;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  onToggleCollapse: (groupKey: string) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}>): ReactElement {
  // A footer is the same row with the controls taken away: no chevron
  // (nothing to collapse from the bottom), no checkbox (the header's own
  // selects the group), and a caption saying what the numbers are.
  const footer = entry.kind === "groupFooter";
  // A "show more" row is the same row again with a button where the label
  // goes: one component, so the three never drift apart in a kit.
  const more = entry.kind === "groupMore";
  const parts = groupRowParts(entry.kind);
  /** What the label cell shows: a button on a "more" row, else the name. */
  let labelContent: ReactNode = entry.label;
  if (entry.kind === "groupMore") {
    labelContent = (
      <GroupMoreButton
        scope={entry.scope}
        remaining={entry.remaining}
        groupKey={entry.groupKey}
        labels={labels}
        onShowMore={onShowMore}
      />
    );
  } else if (footer) {
    labelContent = labels.groupTotal(entry.label);
  }
  const expanded = entry.kind !== "group" || !entry.collapsed;
  const groupState =
    selection && !footer && !more
      ? groupSelectionState(entry.leafIds, selection.selectedIds)
      : "none";
  // One cell per column from the first aggregate onward: a subtotal only reads
  // as one when it sits under the column it totals.
  const layout = groupRowLayout<TRow, ColumnDef<TRow>>(
    columns,
    entry.kind === "groupMore" ? undefined : entry.aggregateCells
  );

  return (
    <Table.Tr
      data-adapttable-part={parts.row}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      fw={600}
    >
      <Table.Td
        colSpan={leadingCells + layout.labelColumns.length}
        data-adapttable-part={parts.cell}
        style={groupIndentStyle(entry.level)}
      >
        <Group gap="xs" wrap="nowrap">
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
            <GroupToggle
              expanded={expanded}
              expandLabel={labels.expandGroup}
              collapseLabel={labels.collapseGroup}
              onToggle={() => onToggleCollapse(entry.key)}
            />
          )}
          {selection && !footer && !more && (
            <Checkbox
              data-adapttable-part="group-select"
              aria-label={labels.selectAll}
              checked={groupState === "all"}
              indeterminate={groupState === "some"}
              onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
            />
          )}
          <Text component="span" data-adapttable-part={parts.label} fw={600}>
            {labelContent}
          </Text>
          <Text
            component="span"
            data-adapttable-part="group-count"
            c="dimmed"
            fz="sm"
          >
            {footer || more ? null : labels.groupCount(groupLeafCount(entry))}
          </Text>
          {layout.labelAggregates.map(({ column, node }) => (
            <Text
              key={column.key}
              component="span"
              data-adapttable-part="group-aggregate"
              data-column={column.key}
              ms="auto"
            >
              {node as ReactNode}
            </Text>
          ))}
        </Group>
      </Table.Td>
      {layout.cells.map(({ column, node }) => (
        <Table.Td
          key={column.key}
          {...getCellProps(column)}
          data-adapttable-part={
            node === undefined ? undefined : "group-aggregate"
          }
          data-column={node === undefined ? undefined : column.key}
        >
          {node as ReactNode}
        </Table.Td>
      ))}
      {showActions && <Table.Td />}
    </Table.Tr>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  columns,
  selection,
  labels,
  onToggleCollapse,
  onShowMore,
  padding = "md",
}: Readonly<{
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** The card's columns, for captioning each subtotal. */
  columns: readonly ColumnDef<TRow>[];
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  onToggleCollapse: (groupKey: string) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  padding?: string;
}>): ReactElement {
  // A footer is the same row with the controls taken away: no chevron
  // (nothing to collapse from the bottom), no checkbox (the header's own
  // selects the group), and a caption saying what the numbers are.
  const footer = entry.kind === "groupFooter";
  // A "show more" row is the same row again with a button where the label
  // goes: one component, so the three never drift apart in a kit.
  const more = entry.kind === "groupMore";
  const parts = groupRowParts(entry.kind);
  /** What the label cell shows: a button on a "more" row, else the name. */
  let labelContent: ReactNode = entry.label;
  if (entry.kind === "groupMore") {
    labelContent = (
      <GroupMoreButton
        scope={entry.scope}
        remaining={entry.remaining}
        groupKey={entry.groupKey}
        labels={labels}
        onShowMore={onShowMore}
      />
    );
  } else if (footer) {
    labelContent = labels.groupTotal(entry.label);
  }
  const expanded = entry.kind !== "group" || !entry.collapsed;
  const groupState =
    selection && !footer && !more
      ? groupSelectionState(entry.leafIds, selection.selectedIds)
      : "none";

  return (
    <Card
      data-adapttable-part={parts.card}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      role="listitem"
      withBorder
      radius="md"
      padding={padding}
      fw={600}
    >
      <Group gap="xs" wrap="nowrap">
        {footer || more ? (
          <GroupToggleSpacer />
        ) : (
          <GroupToggle
            expanded={expanded}
            expandLabel={labels.expandGroup}
            collapseLabel={labels.collapseGroup}
            onToggle={() => onToggleCollapse(entry.key)}
          />
        )}
        {selection && !footer && !more && (
          <Checkbox
            data-adapttable-part="group-select"
            aria-label={labels.selectAll}
            checked={groupState === "all"}
            indeterminate={groupState === "some"}
            onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
          />
        )}
        <Text component="span" data-adapttable-part={parts.label} fw={600}>
          {labelContent}
        </Text>
        <Text
          component="span"
          data-adapttable-part="group-count"
          c="dimmed"
          fz="sm"
        >
          {footer || more ? null : labels.groupCount(groupLeafCount(entry))}
        </Text>
      </Group>
      {/* A card is a list of label/value pairs, not a row of columns, so a
          subtotal is captioned rather than aligned — the same resolver the data
          cards use, so the caption reads identically. */}
      {groupAggregateEntries<TRow, ColumnDef<TRow>>(
        columns,
        entry.kind === "groupMore" ? undefined : entry.aggregateCells
      ).map(({ column, node }) => (
        <Group key={column.key} gap="xs" wrap="nowrap" mt="xs">
          <Text component="span" c="dimmed" fz="sm">
            {resolveMobileLabel(column)}
          </Text>
          <Text
            component="span"
            data-adapttable-part="group-aggregate"
            data-column={column.key}
            ms="auto"
          >
            {node as ReactNode}
          </Text>
        </Group>
      ))}
    </Card>
  );
}
