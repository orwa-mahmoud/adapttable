import {
  type GroupedFlatEntry,
  groupSelectionState,
  type SelectionState,
  type TableLabels,
} from "@adapttable/core";
import { ActionIcon, Card, Checkbox, Group, Table, Text } from "@mantine/core";
import type { ReactElement } from "react";

import { ChevronRightIcon } from "../icons";

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
  columnSpan,
  selection,
  labels,
  onToggleCollapse,
}: Readonly<{
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>;
  columnSpan: number;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  onToggleCollapse: (groupKey: string) => void;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <Table.Tr
      data-adapttable-part="group-row"
      data-collapsed={entry.collapsed ? "true" : undefined}
      fw={600}
    >
      <Table.Td colSpan={columnSpan}>
        <Group gap="xs" wrap="nowrap">
          <GroupToggle
            expanded={expanded}
            expandLabel={labels.expandGroup}
            collapseLabel={labels.collapseGroup}
            onToggle={() => onToggleCollapse(entry.key)}
          />
          {selection && (
            <Checkbox
              data-adapttable-part="group-select"
              aria-label={labels.selectAll}
              checked={groupState === "all"}
              indeterminate={groupState === "some"}
              onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
            />
          )}
          <Text component="span" data-adapttable-part="group-label" fw={600}>
            {entry.label}
          </Text>
          <Text
            component="span"
            data-adapttable-part="group-count"
            c="dimmed"
            fz="sm"
          >
            {labels.groupCount(entry.leafIds.length)}
          </Text>
          {entry.aggregateCells &&
            Object.entries(entry.aggregateCells).map(([key, node]) => (
              <Text
                key={key}
                component="span"
                data-adapttable-part="group-aggregate"
                data-column={key}
                ms="auto"
              >
                {node}
              </Text>
            ))}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  selection,
  labels,
  onToggleCollapse,
  padding = "md",
}: Readonly<{
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  onToggleCollapse: (groupKey: string) => void;
  padding?: string;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <Card
      data-adapttable-part="group-card"
      data-collapsed={entry.collapsed ? "true" : undefined}
      role="listitem"
      withBorder
      radius="md"
      padding={padding}
      fw={600}
    >
      <Group gap="xs" wrap="nowrap">
        <GroupToggle
          expanded={expanded}
          expandLabel={labels.expandGroup}
          collapseLabel={labels.collapseGroup}
          onToggle={() => onToggleCollapse(entry.key)}
        />
        {selection && (
          <Checkbox
            data-adapttable-part="group-select"
            aria-label={labels.selectAll}
            checked={groupState === "all"}
            indeterminate={groupState === "some"}
            onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
          />
        )}
        <Text component="span" data-adapttable-part="group-label" fw={600}>
          {entry.label}
        </Text>
        <Text
          component="span"
          data-adapttable-part="group-count"
          c="dimmed"
          fz="sm"
        >
          {labels.groupCount(entry.leafIds.length)}
        </Text>
      </Group>
    </Card>
  );
}
