import {
  type Direction,
  type GroupedFlatEntry,
  groupSelectionState,
  type SelectionState,
  type TableLabels,
} from "@adapttable/core";
import { ExpandChevron } from "@adapttable/core/adapter";
import { Box, Card, HStack, IconButton, Table, Text } from "@chakra-ui/react";
import type { ReactElement } from "react";

import { subtleText } from "../styles";
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
      size="xs"
      variant="ghost"
      data-adapttable-part="group-toggle"
      aria-expanded={open}
      aria-label={open ? labels.collapseGroup : labels.expandGroup}
      onClick={onToggle}
    >
      <ExpandChevron open={open} dir={dir} />
    </IconButton>
  );
}

/** Kit-native (Chakra) group header row for the desktop table. */
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
  accentColor?: string;
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
      fontWeight="semibold"
    >
      <Table.Cell colSpan={columnSpan} data-adapttable-part="group-cell">
        <HStack gap={2} w="full">
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
                colorPalette={accentColor}
                onToggle={() => selection.toggleGroupLeaves(entry.leafIds)}
              />
            </Box>
          )}
          <Text as="span" data-adapttable-part="group-label">
            {entry.label}
          </Text>
          <Text as="span" data-adapttable-part="group-count" {...subtleText}>
            {labels.groupCount(entry.leafIds.length)}
          </Text>
          {entry.aggregateCells &&
            Object.entries(entry.aggregateCells).map(([key, node]) => (
              <Box
                key={key}
                data-adapttable-part="group-aggregate"
                data-column={key}
                ms="auto"
              >
                {node}
              </Box>
            ))}
        </HStack>
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
  accentColor?: string;
  onToggleCollapse: (groupKey: string) => void;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <Card.Root
      data-adapttable-part="group-card"
      data-collapsed={entry.collapsed ? "true" : undefined}
      variant="outline"
      fontWeight="semibold"
    >
      <Card.Body>
        <HStack gap={2}>
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
                colorPalette={accentColor}
                onToggle={() => selection.toggleGroupLeaves(entry.leafIds)}
              />
            </Box>
          )}
          <Text as="span" data-adapttable-part="group-label">
            {entry.label}
          </Text>
          <Text as="span" data-adapttable-part="group-count" {...subtleText}>
            {labels.groupCount(entry.leafIds.length)}
          </Text>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
