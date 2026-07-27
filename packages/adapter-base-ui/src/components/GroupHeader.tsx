import {
  type Direction,
  type GroupedFlatEntry,
  groupSelectionState,
  type SelectionState,
  type TableLabels,
} from "@adapttable/core";
import { ExpandChevron } from "@adapttable/core/adapter";
import type { ReactElement } from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Card, Flex, IconButton, Table, Text } from "../ui";
import { Checkbox } from "./primitives";

/** Chevron toggle for a row-group's collapse state (mirrors {@link ExpandToggle}). */
function GroupExpandToggle({
  open,
  dir,
  labels,
  onToggle,
}: Readonly<{
  open: boolean;
  dir?: Direction;
  labels: Pick<Required<TableLabels>, "expandGroup" | "collapseGroup">;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="1"
      variant="ghost"
      color="gray"
      data-adapttable-part="group-toggle"
      aria-expanded={open}
      aria-label={open ? labels.collapseGroup : labels.expandGroup}
      onClick={onToggle}
    >
      <ExpandChevron open={open} dir={dir} />
    </IconButton>
  );
}

/** Kit-native (Base UI) group header row for the desktop table. */
export function GroupHeaderRow<TRow>({
  entry,
  columnSpan,
  selection,
  labels,
  dir,
  accentColor,
  onToggleCollapse,
}: Readonly<{
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>;
  columnSpan: number;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  dir?: Direction;
  accentColor?: BaseUiAccentColor;
  onToggleCollapse: (groupKey: string) => void;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <Table.Row
      data-adapttable-part="group-row"
      data-collapsed={entry.collapsed ? "true" : undefined}
      style={{ fontWeight: 600 }}
    >
      <Table.Cell colSpan={columnSpan} data-adapttable-part="group-cell">
        <Flex gap="2" align="center" style={{ width: "100%" }}>
          <GroupExpandToggle
            open={expanded}
            dir={dir}
            labels={labels}
            onToggle={() => onToggleCollapse(entry.key)}
          />
          {selection && (
            <Box data-adapttable-part="group-select">
              <Checkbox
                aria-label={labels.selectAll}
                checked={groupState === "all"}
                indeterminate={groupState === "some"}
                color={accentColor}
                onToggle={() => selection.toggleGroupLeaves(entry.leafIds)}
              />
            </Box>
          )}
          <Text as="span" data-adapttable-part="group-label">
            {entry.label}
          </Text>
          <Text
            as="span"
            data-adapttable-part="group-count"
            color="gray"
            size="2"
          >
            {labels.groupCount(entry.leafIds.length)}
          </Text>
          {entry.aggregateCells &&
            Object.entries(entry.aggregateCells).map(([key, node]) => (
              <Box
                key={key}
                data-adapttable-part="group-aggregate"
                data-column={key}
                style={{ marginInlineStart: "auto" }}
              >
                {node}
              </Box>
            ))}
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  selection,
  labels,
  dir,
  accentColor,
  onToggleCollapse,
}: Readonly<{
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  dir?: Direction;
  accentColor?: BaseUiAccentColor;
  onToggleCollapse: (groupKey: string) => void;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <Card
      data-adapttable-part="group-card"
      data-collapsed={entry.collapsed ? "true" : undefined}
      style={{ fontWeight: 600 }}
    >
      <Flex gap="2" align="center">
        <GroupExpandToggle
          open={expanded}
          dir={dir}
          labels={labels}
          onToggle={() => onToggleCollapse(entry.key)}
        />
        {selection && (
          <Box data-adapttable-part="group-select">
            <Checkbox
              aria-label={labels.selectAll}
              checked={groupState === "all"}
              indeterminate={groupState === "some"}
              color={accentColor}
              onToggle={() => selection.toggleGroupLeaves(entry.leafIds)}
            />
          </Box>
        )}
        <Text as="span" data-adapttable-part="group-label">
          {entry.label}
        </Text>
        <Text
          as="span"
          data-adapttable-part="group-count"
          color="gray"
          size="2"
        >
          {labels.groupCount(entry.leafIds.length)}
        </Text>
      </Flex>
    </Card>
  );
}
